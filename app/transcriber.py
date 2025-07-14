# Conteúdo completo e CORRIGIDO de app/transcriber.py

import os
import sys
import subprocess
import threading
import time
from pathlib import Path
import torch
import whisper
import vosk
import wave
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- Funções de Utilidade (sem alterações) ---
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

# --- Gerenciador de Modelos (sem alterações) ---
class ModelManager:
    def __init__(self):
        self.loaded_models = {}
        self.vosk_model_path = str(Path(__file__).resolve().parent.parent / "vendor" / "vosk-model")

    def get_model(self, model_name: str):
        if model_name in self.loaded_models:
            return self.loaded_models[model_name]
        print(f"Carregando modelo '{model_name}'...")
        model = None
        try:
            if model_name.startswith('whisper'):
                whisper_size = model_name.split('_')[1]
                model = whisper.load_model(whisper_size)
            elif model_name == 'vosk':
                if not Path(self.vosk_model_path).exists():
                    raise FileNotFoundError(f"Pasta do modelo Vosk não encontrada: {self.vosk_model_path}")
                model = vosk.Model(self.vosk_model_path)
            if model:
                self.loaded_models[model_name] = model
            return model
        except Exception as e:
            print(f"[ERRO CRÍTICO] Falha ao carregar o modelo '{model_name}': {e}")
            return None

# --- CLASSE GERENCIADORA DE TRANSCRIÇÃO (ATUALIZADA) ---
class TranscriptionManager:
    def __init__(self, dest_path, model_name, file_list, model_manager, keep_structure=False, source_path=None, max_concurrent_tasks=1):
        self.dest_path = Path(dest_path)
        self.model_name = model_name
        self.model_manager = model_manager
        self.model = None
        self.files_to_process = file_list
        self.total_files = len(file_list)
        self.files_processed_count = 0
        self.status = "idle" # idle, running, paused, stopped, completed, error
        self.progress_general = 0
        self.batch_start_time = None
        
        # --- NOVOS ATRIBUTOS PARA CONCORRÊNCIA E CONTROLE ---
        self.max_concurrent_tasks = max_concurrent_tasks
        self.stop_requested = threading.Event() # Usar Event para parada segura em threads
        self.pause_event = threading.Event()
        self.pause_event.set() # Começa "não pausado" (set = pode prosseguir)
        
        # Dicionários para rastrear o estado de cada arquivo
        self.files_in_progress = {} # {filepath: {info}}
        self.files_in_progress_lock = threading.Lock()
        
        self.newly_completed_files = []
        self.completed_files_lock = threading.Lock()

        # --- ATRIBUTOS DE ESTRUTURA ---
        self.keep_structure = keep_structure
        self.source_path = Path(source_path) if source_path else None

    # --- MÉTODOS DE CONTROLE DE PROCESSO ---
    def request_stop(self):
        print("[AVISO] Solicitação de parada recebida.")
        self.stop_requested.set()
        self.pause_event.set() # Libera qualquer thread pausada para que ela possa parar

    def request_pause(self):
        if self.status == "running":
            self.pause_event.clear() # Bloqueia as threads que chamarem .wait()
            self.status = "paused"
            print("[INFO] Processo pausado.")

    def request_resume(self):
        if self.status == "paused":
            self.pause_event.set() # Libera as threads bloqueadas
            self.status = "running"
            print("[INFO] Processo retomado.")

    def _format_time(self, seconds):
        if seconds is None or seconds < 0: return "00:00"
        minutes, seconds = divmod(int(seconds), 60)
        return f"{minutes:02d}:{seconds:02d}"

    def _get_estimated_duration(self, wav_file_path):
        try:
            with wave.open(str(wav_file_path), 'rb') as wf:
                return wf.getnframes() / float(wf.getframerate())
        except Exception:
            return wav_file_path.stat().st_size / (1024 * 1024) * 60

    # --- LÓGICA DE TRANSCRIÇÃO (COM CHECAGEM DE PAUSA/PARADA) ---
    def _transcribe_with_vosk(self, temp_wav_file, file_path_str):
        recognizer = vosk.KaldiRecognizer(self.model, 16000)
        full_transcript = []
        with wave.open(str(temp_wav_file), "rb") as wf:
            total_frames = wf.getnframes()
            if total_frames == 0: return ""
            
            while not self.stop_requested.is_set():
                self.pause_event.wait() # Ponto de pausa
                if self.stop_requested.is_set(): break

                data = wf.readframes(4000)
                if len(data) == 0: break
                
                progress = (wf.tell() / total_frames) * 100
                with self.files_in_progress_lock:
                    if file_path_str in self.files_in_progress:
                        self.files_in_progress[file_path_str]['progress'] = progress

                if recognizer.AcceptWaveform(data):
                    result_json = json.loads(recognizer.Result())
                    full_transcript.append(result_json.get('text', ''))

            if not self.stop_requested.is_set():
                final_result_json = json.loads(recognizer.FinalResult())
                full_transcript.append(final_result_json.get('text', ''))

        return " ".join(full_transcript).strip()

    def _transcribe_with_whisper(self, temp_wav_file, file_path_str):
        # Whisper não tem callback de progresso, então simulamos
        # A simulação é menos importante em modo concorrente, pois o progresso geral avança
        # quando qualquer arquivo termina.
        with self.files_in_progress_lock:
            if file_path_str in self.files_in_progress:
                self.files_in_progress[file_path_str]['progress'] = 50 # Indica que está no meio
        
        self.pause_event.wait() # Ponto de pausa antes de iniciar a tarefa pesada
        if self.stop_requested.is_set(): return None

        result = self.model.transcribe(str(temp_wav_file), language='pt', fp16=torch.cuda.is_available())
        return result['text'].strip()

    def _transcribe_single_file(self, file_path_str):
        """Processa um único arquivo. Retorna o caminho do arquivo de origem se for bem-sucedido."""
        if self.stop_requested.is_set():
            return None

        file_path = Path(file_path_str)
        base_name = file_path.name
        
        with self.files_in_progress_lock:
            self.files_in_progress[file_path_str] = {
                "filename": base_name,
                "progress": 0,
                "status_text": "Iniciando..."
            }

        # Checagem de Pausa/Parada
        self.pause_event.wait()
        if self.stop_requested.is_set(): return None

        # Define o caminho de saída
        if self.keep_structure and self.source_path and file_path.is_relative_to(self.source_path):
            relative_path = file_path.relative_to(self.source_path)
            output_txt_path = self.dest_path / relative_path.with_suffix('.txt')
        else:
            output_txt_path = self.dest_path / file_path.with_suffix('.txt').name
        output_txt_path.parent.mkdir(parents=True, exist_ok=True)
        
        temp_wav_file = self.dest_path / f"temp_{os.getpid()}_{threading.get_ident()}.wav"

        try:
            with self.files_in_progress_lock:
                self.files_in_progress[file_path_str]['status_text'] = "Convertendo..."
                self.files_in_progress[file_path_str]['progress'] = 5

            if not convert_to_wav(str(file_path), str(temp_wav_file)):
                raise Exception("Falha na conversão para WAV")

            self.pause_event.wait()
            if self.stop_requested.is_set(): return None

            with self.files_in_progress_lock:
                self.files_in_progress[file_path_str]['status_text'] = "Transcrevendo..."
                self.files_in_progress[file_path_str]['progress'] = 10

            transcript_text = None
            if self.model_name.startswith('whisper'):
                transcript_text = self._transcribe_with_whisper(temp_wav_file, file_path_str)
            elif self.model_name == 'vosk':
                transcript_text = self._transcribe_with_vosk(temp_wav_file, file_path_str)
            
            if self.stop_requested.is_set(): return None

            if transcript_text:
                with self.files_in_progress_lock:
                     self.files_in_progress[file_path_str]['status_text'] = "Salvando..."
                     self.files_in_progress[file_path_str]['progress'] = 98
                with open(output_txt_path, 'w', encoding='utf-8') as f:
                    f.write(transcript_text)
                
                # Adiciona à lista de recém-concluídos de forma segura
                with self.completed_files_lock:
                    self.newly_completed_files.append({
                        "source_path": file_path_str,
                        "output_path": str(output_txt_path)
                    })
                return file_path_str # Sucesso
            else:
                raise Exception("Transcrição retornou texto vazio")

        except Exception as e:
            print(f"[ERRO] Falha ao processar {base_name}: {e}")
            return None # Falha
        finally:
            # Limpa o arquivo temporário
            if os.path.exists(temp_wav_file):
                try:
                    os.remove(temp_wav_file)
                except OSError:
                    pass
            # Remove o arquivo da lista de "em progresso"
            with self.files_in_progress_lock:
                if file_path_str in self.files_in_progress:
                    del self.files_in_progress[file_path_str]

    def run_transcription(self):
        self.model = self.model_manager.get_model(self.model_name)
        if not self.model:
            self.status = "error"
            return

        self.status = "running"
        self.batch_start_time = time.time()
        self.files_processed_count = 0
        
        with ThreadPoolExecutor(max_workers=self.max_concurrent_tasks) as executor:
            # Submete todas as tarefas
            future_to_file = {executor.submit(self._transcribe_single_file, fp): fp for fp in self.files_to_process}

            for future in as_completed(future_to_file):
                if self.stop_requested.is_set():
                    # Cancela as futuras pendentes se possível (não cancela as que já estão rodando)
                    for f in future_to_file:
                        f.cancel()
                    break
                
                result_filepath = future.result()
                if result_filepath: # Se não for None, foi sucesso
                    self.files_processed_count += 1
        
        # Define o status final
        if self.stop_requested.is_set():
            self.status = "stopped"
            print("PROCESSO INTERROMPIDO.")
        else:
            self.status = "completed"
            print("PROCESSO CONCLUÍDO.")
        
        self.progress_general = (self.files_processed_count / self.total_files) * 100 if self.total_files > 0 else 100

    def get_status(self):
        with self.completed_files_lock:
            completed_list = self.newly_completed_files
            self.newly_completed_files = []
        
        with self.files_in_progress_lock:
            in_progress_list = list(self.files_in_progress.items())

        if self.status in ["running", "paused"] and self.total_files > 0:
            # Calcula o progresso geral baseado nos arquivos já concluídos
            self.progress_general = (self.files_processed_count / self.total_files) * 100
        
        batch_elapsed_str = self._format_time(time.time() - self.batch_start_time) if self.batch_start_time else "00:00"

        return {
            "status": self.status,
            "progress_general": self.progress_general,
            "batch_elapsed_str": batch_elapsed_str,
            "total_files": self.total_files,
            "files_processed": self.files_processed_count,
            "files_in_progress": dict(in_progress_list), # Envia uma cópia do dicionário
            "completed_files": completed_list # Envia a lista de arquivos recém-concluídos
        }