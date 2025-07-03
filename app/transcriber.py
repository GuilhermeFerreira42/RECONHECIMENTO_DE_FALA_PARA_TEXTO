# Conteúdo completo e CORRIGIDO de app/transcriber.py

import os
import sys
import subprocess
import threading
from pathlib import Path
import time

# Imports para ambos os modelos
import torch
import whisper
import vosk
import wave
import json

# Funções de utilidade
SUPPORTED_EXTENSIONS = ('.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.m4a', '.flac')

def get_ffmpeg_path():
    base_path = Path(__file__).resolve().parent.parent
    vendor_path = base_path / "vendor" / "ffmpeg"
    if sys.platform == "win32":
        return str(vendor_path / "windows" / "ffmpeg.exe")
    elif sys.platform == "linux":
        return str(vendor_path / "linux" / "ffmpeg")
    elif sys.platform == "darwin":
        return str(vendor_path / "macos" / "ffmpeg")
    else:
        return "ffmpeg"

def convert_to_wav(media_path, temp_wav_path):
    ffmpeg_path = get_ffmpeg_path()
    command = [
        ffmpeg_path, '-i', str(media_path), '-ar', '16000', '-ac', '1',
        '-c:a', 'pcm_s16le', '-y', str(temp_wav_path)
    ]
    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERRO] Falha na conversão do FFmpeg para {media_path}: {e}")
        return False

# --- NOVO: GERENCIADOR DE MODELOS ---
class ModelManager:
    """Carrega e armazena em cache os modelos de IA para evitar recarregamentos lentos."""
    def __init__(self):
        self.loaded_models = {}
        # Caminho para o modelo Vosk dentro do projeto
        self.vosk_model_path = str(Path(__file__).resolve().parent.parent / "vendor" / "vosk-model")

    def get_model(self, model_name: str):
        """
        Obtém um modelo. Se não estiver em cache, carrega-o.
        Exemplos de model_name: 'whisper_base', 'vosk'
        """
        if model_name in self.loaded_models:
            print(f"Retornando modelo '{model_name}' do cache.")
            return self.loaded_models[model_name]

        print(f"Carregando modelo '{model_name}' pela primeira vez...")
        model = None
        try:
            if model_name.startswith('whisper'):
                whisper_size = model_name.split('_')[1] # ex: 'base'
                model = whisper.load_model(whisper_size)
            elif model_name == 'vosk':
                if not Path(self.vosk_model_path).exists():
                    raise FileNotFoundError(f"Pasta do modelo Vosk não encontrada em: {self.vosk_model_path}")
                model = vosk.Model(self.vosk_model_path)
            
            if model:
                self.loaded_models[model_name] = model
                print(f"Modelo '{model_name}' carregado com sucesso.")
            return model
        except Exception as e:
            print(f"[ERRO CRÍTICO] Falha ao carregar o modelo '{model_name}': {e}")
            return None

# --- CLASSE GERENCIADORA DE TRANSCRIÇÃO (MODIFICADA) ---
class TranscriptionManager:
    # MODIFICADO: Aceita model_name (string) em vez de um objeto de modelo
    def __init__(self, dest_path, model_name, file_list, model_manager, keep_structure=False, source_path=None):
        self.dest_path = Path(dest_path)
        self.model_name = model_name
        self.model_manager = model_manager
        self.model = None
        self.files_to_process = file_list
        self.total_files = len(file_list)
        self.files_processed_count = 0
        self.status = "idle"
        self.progress_general = 0
        self.batch_start_time = None  # NOVO: início do batch
        self.current_file_info = {"filename": "", "progress": 0, "full_path": "", "elapsed_str": "00:00", "eta_str": "00:00"}
        self.stop_requested = False
        self.keep_structure = keep_structure
        self.source_path = Path(source_path) if source_path else None
        self.newly_completed_files = []

    def request_stop(self):
        print("[AVISO] Solicitação de parada recebida.")
        self.stop_requested = True

    def _format_time(self, seconds):
        if seconds is None or seconds < 0:
            return "00:00"
        minutes, seconds = divmod(int(seconds), 60)
        return f"{minutes:02d}:{seconds:02d}"

    def _get_estimated_duration(self, wav_file_path):
        try:
            with wave.open(str(wav_file_path), 'rb') as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                return frames / float(rate) if rate > 0 else 0
        except Exception:
            file_size_mb = wav_file_path.stat().st_size / (1024 * 1024)
            return file_size_mb * 60

    # NOVO: Lógica de transcrição específica do Whisper
    def _transcribe_with_whisper(self, temp_wav_file):
        print("     -> Transcrevendo áudio com Whisper (com progresso simulado)...")
        file_duration = self._get_estimated_duration(temp_wav_file)
        progress_start_time = time.time()
        def simulate_progress():
            while not self.stop_requested and self.current_file_info["progress"] < 90:
                time.sleep(1)
                if self.stop_requested:
                    break
                elapsed_time = time.time() - progress_start_time
                progress_percentage = min(90, 10 + int((elapsed_time / file_duration) * 80)) if file_duration > 0 else 50
                self.current_file_info["progress"] = progress_percentage
                self.current_file_info["elapsed_str"] = self._format_time(elapsed_time)
                time_per_percent = elapsed_time / (progress_percentage - 10) if progress_percentage > 10 else float('inf')
                eta_seconds = (100 - progress_percentage) * time_per_percent if time_per_percent != float('inf') else None
                self.current_file_info["eta_str"] = self._format_time(eta_seconds)
        progress_thread = threading.Thread(target=simulate_progress)
        progress_thread.daemon = True
        progress_thread.start()
        result = self.model.transcribe(str(temp_wav_file), language='pt', fp16=torch.cuda.is_available())
        transcript_text = result['text'].strip()
        if progress_thread.is_alive():
            progress_thread.join(timeout=1)
        return transcript_text

    # NOVO: Lógica de transcrição específica do Vosk com progresso real
    def _transcribe_with_vosk(self, temp_wav_file):
        print("     -> Transcrevendo áudio com Vosk (com progresso real)...")
        recognizer = vosk.KaldiRecognizer(self.model, 16000)
        full_transcript = []
        progress_start_time = time.time()
        with wave.open(str(temp_wav_file), "rb") as wf:
            total_frames = wf.getnframes()
            if total_frames == 0: 
                return ""
            chunk_size = 4000
            while not self.stop_requested:
                data = wf.readframes(chunk_size)
                if len(data) == 0:
                    break
                elapsed_time = time.time() - progress_start_time
                progress_percentage = min(95, int((wf.tell() / total_frames) * 100)) if total_frames > 0 else 0
                self.current_file_info["progress"] = progress_percentage
                self.current_file_info["elapsed_str"] = self._format_time(elapsed_time)
                if progress_percentage > 0:
                    total_estimated_time = (elapsed_time / progress_percentage) * 100
                    eta_seconds = total_estimated_time - elapsed_time
                    self.current_file_info["eta_str"] = self._format_time(eta_seconds)
                else:
                    self.current_file_info["eta_str"] = "Estimando..."
                if recognizer.AcceptWaveform(data):
                    result_json = json.loads(recognizer.Result())
                    full_transcript.append(result_json.get('text', ''))
            if not self.stop_requested:
                final_result_json = json.loads(recognizer.FinalResult())
                full_transcript.append(final_result_json.get('text', ''))
        return " ".join(full_transcript).strip()

    def _transcribe_single_file(self, file_path_str):
        file_path = Path(file_path_str)
        base_name = file_path.name
        self.current_file_info = {
            "filename": base_name,
            "progress": 0,
            "full_path": file_path_str,
            "elapsed_str": "00:00",
            "eta_str": "00:00"
        }
        print(f"\n--- Processando: {base_name} ---")
        output_txt_path_obj = None
        if self.keep_structure and self.source_path and file_path.is_relative_to(self.source_path):
            relative_path = file_path.relative_to(self.source_path)
            output_txt_path_obj = self.dest_path / relative_path.with_suffix('.txt')
        else:
            output_txt_path_obj = self.dest_path / file_path.with_suffix('.txt').name
        output_txt_path_obj.parent.mkdir(parents=True, exist_ok=True)
        temp_wav_file = self.dest_path / f"temp_{file_path.stem}.wav"
        print("    -> Convertendo para WAV...")
        self.current_file_info["progress"] = 5
        if not convert_to_wav(str(file_path), str(temp_wav_file)):
            self.current_file_info["progress"] = "Erro na conversão"
            return
        self.current_file_info["progress"] = 10
        print("    -> Conversão concluída.")
        file_duration = self._get_estimated_duration(temp_wav_file)
        transcript_text = None
        try:
            if self.model_name.startswith('whisper'):
                transcript_text = self._transcribe_with_whisper(temp_wav_file)
            elif self.model_name == 'vosk':
                transcript_text = self._transcribe_with_vosk(temp_wav_file)
            else:
                raise ValueError(f"Modelo desconhecido: {self.model_name}")
            self.current_file_info["progress"] = 95
            print("     -> Transcrição concluída.")
        except Exception as e:
            print(f"[ERRO] Falha ao transcrever: {e}")
            self.current_file_info["progress"] = "Erro na transcrição"
            try:
                os.remove(temp_wav_file)
            except OSError:
                pass
            return
        if transcript_text and not self.stop_requested:
            self.current_file_info["progress"] = 98
            with open(output_txt_path_obj, 'w', encoding='utf-8') as f:
                f.write(transcript_text)
            print(f"    -> Salvo em: {output_txt_path_obj}")
            self.newly_completed_files.append({
                "source_path": file_path_str,
                "output_path": str(output_txt_path_obj)
            })
        else:
            print(f"    -> Nenhuma transcrição gerada ou processo interrompido. Arquivo de texto não foi salvo.")
        try:
            os.remove(temp_wav_file)
            print(f"    -> Arquivo temporário removido.")
        except OSError as e:
            print(f"[ERRO] Não foi possível remover o arquivo temporário {temp_wav_file}: {e}")
        self.current_file_info["progress"] = 100

    def run_transcription(self):
        self.model = self.model_manager.get_model(self.model_name)
        if not self.model:
            self.status = "error"
            print(f"[ERRO] Modelo '{self.model_name}' não pôde ser carregado.")
            return
        if not self.files_to_process:
            self.status = "completed"
            print("[AVISO] Nenhuma arquivo de mídia para processar.")
            return
        self.status = "running"
        self.batch_start_time = time.time()  # INÍCIO DO BATCH
        self.files_processed_count = 0
        for file_path in self.files_to_process:
            if self.stop_requested:
                print("[INFO] Loop de processamento interrompido.")
                break
            try:
                self._transcribe_single_file(file_path)
            except Exception as e:
                print(f"[ERRO GERAL] Falha ao processar {file_path}: {e}")
            if not self.stop_requested:
                self.files_processed_count += 1
                # Progresso geral dinâmico agora será calculado em get_status
        if self.stop_requested:
            self.status = "stopped"
            self.current_file_info = {"filename": "Processo interrompido!", "progress": 0, "full_path": ""}
            print("\n" + "="*50)
            print("PROCESSO DE TRANSCRIÇÃO INTERROMPIDO PELO USUÁRIO")
            print("="*50)
        else:
            self.status = "completed"
            self.current_file_info = {"filename": "Processo finalizado!", "progress": 100, "full_path": ""}
            print("\n" + "="*50)
            print("PROCESSO DE TRANSCRIÇÃO CONCLUÍDO")
            print("="*50)

    def get_status(self):
        completed_list = self.newly_completed_files
        self.newly_completed_files = []
        progress_general = 0
        batch_elapsed_str = "00:00"
        if self.status == "running" and self.total_files > 0:
            progress_of_current_file = self.current_file_info.get("progress", 0) / 100.0
            progress_general = ((self.files_processed_count + progress_of_current_file) / self.total_files) * 100
            batch_elapsed_seconds = time.time() - self.batch_start_time
            batch_elapsed_str = self._format_time(batch_elapsed_seconds)
        elif self.status == "completed":
            progress_general = 100
            if self.batch_start_time:
                batch_elapsed_str = self._format_time(time.time() - self.batch_start_time)
        return {
            "status": self.status,
            "progress_general": progress_general,
            "batch_elapsed_str": batch_elapsed_str,
            "total_files": self.total_files,
            "files_processed": self.files_processed_count,
            "current_file": self.current_file_info,
            "completed_files": completed_list
        }