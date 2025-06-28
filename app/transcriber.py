# Conteúdo completo e CORRIGIDO de app/transcriber.py

import os
import sys
import subprocess
import json
from pathlib import Path
import vosk
import wave
import time

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

# --- CLASSE GERENCIADORA ---

class TranscriptionManager:
    def __init__(self, dest_path, model, file_list):
        self.dest_path = dest_path
        self.model = model
        self.files_to_process = file_list
        self.total_files = len(file_list)
        self.files_processed_count = 0
        self.status = "idle"
        self.progress_general = 0
        self.current_file_info = {"filename": "", "progress": 0, "full_path": ""}
        self.stop_requested = False

    def request_stop(self):
        print("[AVISO] Solicitação de parada recebida.")
        self.stop_requested = True

    def _transcribe_single_file(self, file_path):
        base_name = os.path.basename(file_path)
        self.current_file_info = {
            "filename": base_name,
            "progress": 0,
            "full_path": file_path
        }
        print(f"\n--- Processando: {base_name} ---")
        output_txt_path_obj = Path(self.dest_path) / Path(base_name).with_suffix('.txt')
        output_txt_path_obj.parent.mkdir(parents=True, exist_ok=True)
        file_stem = Path(file_path).stem
        temp_wav_file = Path(self.dest_path) / f"temp_{file_stem}.wav"
        
        print("    -> Convertendo para WAV...")
        if not convert_to_wav(file_path, temp_wav_file):
            self.current_file_info["progress"] = "Erro na conversão"
            return

        print("    -> Transcrevendo áudio...")
        transcript_text = None 
        try:
            with wave.open(str(temp_wav_file), "rb") as wf:
                total_frames = wf.getnframes()
                # Se o arquivo WAV estiver vazio, não há o que transcrever
                if total_frames == 0:
                    print("[AVISO] Arquivo WAV está vazio ou corrompido. Pulando.")
                    self.current_file_info["progress"] = 100
                    return # Retorna aqui para evitar processamento desnecessário

                recognizer = vosk.KaldiRecognizer(self.model, wf.getframerate())
                full_transcript = []
                while True:
                    if self.stop_requested:
                        print("    -> Parada detectada durante a transcrição.")
                        break

                    data = wf.readframes(4000)
                    if len(data) == 0:
                        break
                        
                    frames_read = wf.tell()
                    self.current_file_info["progress"] = int((frames_read / total_frames) * 100)
                    recognizer.AcceptWaveform(data)

                if not self.stop_requested:
                    final_result = json.loads(recognizer.FinalResult())
                    # Acessa o texto e remove espaços em branco extras
                    full_transcript.append(final_result.get('text', ''))
                    transcript_text = ' '.join(full_transcript).strip()
                    self.current_file_info["progress"] = 100

        except Exception as e:
            print(f"[ERRO] Falha ao ler ou transcrever o arquivo WAV: {e}")
            self.current_file_info["progress"] = "Erro na transcrição"
        
        # *** A CORREÇÃO PRINCIPAL ESTÁ AQUI ***
        # Em vez de 'if transcript_text is not None', usamos 'if transcript_text:'
        # Isso garante que a string não seja apenas 'não nula', mas também 'não vazia'.
        if transcript_text and not self.stop_requested:
            with open(output_txt_path_obj, 'w', encoding='utf-8') as f:
                f.write(transcript_text)
            print(f"    -> Salvo em: {output_txt_path_obj}")
        else:
            print(f"    -> Nenhuma transcrição gerada ou processo interrompido. Arquivo de texto não foi salvo.")

        try:
            os.remove(temp_wav_file)
            print(f"    -> Arquivo temporário removido.")
        except OSError as e:
            print(f"[ERRO] Não foi possível remover o arquivo temporário {temp_wav_file}: {e}")

    # O resto do arquivo (run_transcription, get_status, load_vosk_model) permanece o mesmo
    # da sugestão anterior. O erro estava confinado em _transcribe_single_file.
    def run_transcription(self):
        if not self.model:
            self.status = "error"
            print("[ERRO] Modelo Vosk não está carregado.")
            return
        if not self.files_to_process:
            self.status = "completed"
            print("[AVISO] Nenhuma arquivo de mídia para processar.")
            return

        self.status = "running"
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
                if self.total_files > 0:
                    self.progress_general = int((self.files_processed_count / self.total_files) * 100)
            
            print(f"Progresso Geral: {self.progress_general}%")

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
        return {
            "status": self.status,
            "progress_general": self.progress_general,
            "total_files": self.total_files,
            "files_processed": self.files_processed_count,
            "current_file": self.current_file_info
        }

def load_vosk_model():
    base_path = Path(__file__).resolve().parent.parent
    model_path = base_path / "vendor" / "vosk-model"
    if not model_path.exists():
        return None
    try:
        model = vosk.Model(str(model_path))
        return model
    except Exception as e:
        print(f"Erro ao carregar modelo vosk: {e}")
        return None