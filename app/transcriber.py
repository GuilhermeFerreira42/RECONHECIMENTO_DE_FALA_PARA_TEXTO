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
    else: # Linux/macOS
        return str(vendor_path / ({"linux": "linux", "darwin": "macos"}[sys.platform]) / "ffmpeg")

def convert_to_wav(media_path, temp_wav_path):
    ffmpeg_path = get_ffmpeg_path()
    command = [ffmpeg_path, '-i', str(media_path), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', '-y', str(temp_wav_path)]
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
                model = whisper.load_model(model_name.split('_')[1])
            elif model_name == 'vosk':
                model = vosk.Model(self.vosk_model_path)
            if model:
                self.loaded_models[model_name] = model
            return model
        except Exception as e:
            print(f"[ERRO CRÍTICO] Falha ao carregar o modelo '{model_name}': {e}")
            return None

# --- CLASSE GERENCIADORA DE TRANSCRIÇÃO (ATUALIZADA) ---
class TranscriptionManager:
    # ATUALIZADO: Construtor não recebe mais `source_path`
    def __init__(self, dest_path, model_name, file_list, model_manager, keep_structure=False, max_concurrent_tasks=1):
        self.dest_path = Path(dest_path)
        self.model_name = model_name
        self.model_manager = model_manager
        self.model = None
        self.files_to_process = file_list # Agora uma lista de objetos: [{'path': ..., 'source': ...}]
        self.total_files = len(file_list)
        self.files_processed_count = 0
        self.status = "idle"
        self.progress_general = 0
        self.batch_start_time = None
        
        self.max_concurrent_tasks = max_concurrent_tasks
        self.stop_requested = threading.Event()
        self.pause_event = threading.Event()
        self.pause_event.set()
        
        self.files_in_progress = {}
        self.files_in_progress_lock = threading.Lock()
        
        self.newly_completed_files = []
        self.completed_files_lock = threading.Lock()

        self.keep_structure = keep_structure
        # REMOVIDO: self.source_path foi substituído pela lógica dentro de _transcribe_single_file
        self.executor = None
        self.pause_events = {}

    def prioritize_file(self, file_path):
        # Remove o arquivo da fila e insere no início
        idx = next((i for i, f in enumerate(self.files_to_process) if f['path'] == file_path), None)
        if idx is not None:
            file_info = self.files_to_process.pop(idx)
            self.files_to_process.insert(0, file_info)
            # Interrompe o atual e permite reprocessamento imediato
            self.request_pause()
            self.request_resume()

    def request_stop(self):
        print("[AVISO] Solicitação de parada recebida.")
        self.stop_requested.set()
        if self.pause_event.is_set() is False:
            self.pause_event.set()
        if self.executor:
            self.executor.shutdown(wait=False, cancel_futures=True)

    def request_pause(self):
        if self.status == "running":
            self.pause_event.clear()
            self.status = "paused"
            print("[INFO] Processo pausado.")

    def request_resume(self):
        if self.status == "paused":
            self.pause_event.set()
            self.status = "running"
            print("[INFO] Processo retomado.")
            
    def update_concurrency(self, new_max_tasks):
        self.max_concurrent_tasks = new_max_tasks
        if self.executor and self.status == "running":
            print(f"[INFO] Concorrência será ajustada para {new_max_tasks} na próxima leva de tarefas.")
            # A mudança real acontece na recriação do executor, se a lógica permitir.
            # Para uma mudança em tempo real, seria necessário um gerenciamento de pool mais complexo.
            # Por agora, a configuração será usada na próxima inicialização.

    def request_pause_file(self, file_path):
        """Pausa apenas o arquivo especificado."""
        if file_path not in self.pause_events:
            self.pause_events[file_path] = threading.Event()
        self.pause_events[file_path].clear()
        with self.files_in_progress_lock:
            if file_path in self.files_in_progress:
                self.files_in_progress[file_path]['status'] = 'paused'

    def request_resume_file(self, file_path):
        """Retoma apenas o arquivo especificado."""
        if file_path in self.pause_events:
            self.pause_events[file_path].set()
        with self.files_in_progress_lock:
            if file_path in self.files_in_progress:
                self.files_in_progress[file_path]['status'] = 'running'

    def _wait_file_pause(self, file_path):
        if file_path in self.pause_events:
            self.pause_events[file_path].wait()

    def _format_time(self, seconds):
        if seconds is None or not isinstance(seconds, (int, float)) or seconds < 0:
            return "--:--"
        minutes, seconds = divmod(int(seconds), 60)
        return f"{minutes:02d}:{seconds:02d}"

    def _update_file_progress(self, file_path_str, progress, start_time):
        with self.files_in_progress_lock:
            if file_path_str in self.files_in_progress:
                elapsed = time.time() - start_time
                eta = (elapsed / progress * (100 - progress)) if progress > 0 else None
                self.files_in_progress[file_path_str]['progress'] = progress
                self.files_in_progress[file_path_str]['elapsed_str'] = self._format_time(elapsed)
                self.files_in_progress[file_path_str]['eta_str'] = self._format_time(eta)

    def _transcribe_with_vosk(self, temp_wav_file, file_path_str, start_time):
        recognizer = vosk.KaldiRecognizer(self.model, 16000)
        full_transcript = []
        with wave.open(str(temp_wav_file), "rb") as wf:
            total_frames = wf.getnframes()
            if total_frames == 0: return ""
            
            while not self.stop_requested.is_set():
                self.pause_event.wait()
                data = wf.readframes(4000)
                if len(data) == 0: break
                
                self._update_file_progress(file_path_str, (wf.tell() / total_frames) * 100, start_time)

                if recognizer.AcceptWaveform(data):
                    full_transcript.append(json.loads(recognizer.Result()).get('text', ''))

            if not self.stop_requested.is_set():
                full_transcript.append(json.loads(recognizer.FinalResult()).get('text', ''))
        return " ".join(full_transcript).strip()

    def _transcribe_with_whisper(self, temp_wav_file, file_path_str, start_time):
        self.pause_event.wait()
        if self.stop_requested.is_set(): return None
        if self.model is None:
            raise Exception("Modelo Whisper não carregado corretamente.")
        # Simulação de progresso para Whisper
        self._update_file_progress(file_path_str, 50, start_time)
        result = self.model.transcribe(str(temp_wav_file), language='pt', fp16=torch.cuda.is_available())
        self._update_file_progress(file_path_str, 100, start_time)
        return result['text'].strip()

    def _transcribe_single_file(self, file_info):
        if self.stop_requested.is_set(): return None
        
        # Extrai as informações do objeto
        file_path_str = file_info['path']
        source_path_str = file_info.get('source') # .get() para lidar com arquivos avulsos (source: null)
        
        file_path = Path(file_path_str)
        start_time = time.time()
        
        with self.files_in_progress_lock:
            self.files_in_progress[file_path_str] = {
                "filename": file_path.name, "progress": 0, "status": "running",
                "elapsed_str": "00:00", "eta_str": "--:--"
            }

        self.pause_event.wait()
        if file_path_str in self.pause_events: self.pause_events[file_path_str].wait()
        if self.stop_requested.is_set(): return None

        # ATUALIZADO: Lógica de criação do caminho de saída para múltiplas origens
        if self.keep_structure and source_path_str:
            source_path = Path(source_path_str)
            # Garante que o arquivo pertence à sua pasta de origem antes de calcular o caminho relativo
            try:
                relative_part = file_path.relative_to(source_path)
                output_txt_path = self.dest_path / relative_part.with_suffix('.txt')
            except ValueError:
                output_txt_path = self.dest_path / file_path.with_suffix('.txt').name
        else:
            # Para arquivos avulsos ou se a estrutura não for mantida
            output_txt_path = self.dest_path / file_path.with_suffix('.txt').name
        
        output_txt_path.parent.mkdir(parents=True, exist_ok=True)
        
        temp_wav_file = self.dest_path / f"temp_{os.getpid()}_{threading.get_ident()}.wav"

        try:
            if not convert_to_wav(str(file_path), str(temp_wav_file)):
                raise Exception("Falha na conversão")

            self.pause_event.wait()
            if file_path_str in self.pause_events: self.pause_events[file_path_str].wait()
            if self.stop_requested.is_set(): return None

            transcript_text = None
            if self.model_name.startswith('whisper'):
                transcript_text = self._transcribe_with_whisper(temp_wav_file, file_path_str, start_time)
            else: # Vosk
                transcript_text = self._transcribe_with_vosk(temp_wav_file, file_path_str, start_time)
            
            if self.stop_requested.is_set(): return None

            if transcript_text:
                with open(output_txt_path, 'w', encoding='utf-8') as f: f.write(transcript_text)
                with self.completed_files_lock:
                    # O source_path retornado é o caminho do arquivo original, como esperado pelo frontend
                    self.newly_completed_files.append({"source_path": file_path_str, "output_path": str(output_txt_path)})
                return file_path_str
            else:
                raise Exception("Transcrição vazia")
        except Exception as e:
            print(f"[ERRO] Falha em {file_path.name}: {e}")
            return None
        finally:
            if os.path.exists(temp_wav_file):
                try: os.remove(temp_wav_file)
                except OSError: pass
            with self.files_in_progress_lock:
                if file_path_str in self.files_in_progress:
                    del self.files_in_progress[file_path_str]
            if file_path_str in self.pause_events:
                del self.pause_events[file_path_str]

    def run_transcription(self):
        self.model = self.model_manager.get_model(self.model_name)
        if not self.model:
            self.status = "error"
            return
        self.status = "running"
        self.batch_start_time = time.time()
        self.files_processed_count = 0
        self.executor = ThreadPoolExecutor(max_workers=self.max_concurrent_tasks)
        future_to_file = {self.executor.submit(self._transcribe_single_file, fp): fp for fp in self.files_to_process}
        for future in as_completed(future_to_file):
            if self.stop_requested.is_set():
                for f in future_to_file:
                    f.cancel()
                break
            result_filepath = future.result()
            if result_filepath:
                self.files_processed_count += 1
        if self.stop_requested.is_set():
            self.status = "stopped"
        else:
            self.status = "completed"
        self.progress_general = (self.files_processed_count / self.total_files) * 100 if self.total_files > 0 else 100

    def get_status(self):
        with self.completed_files_lock:
            completed_list = self.newly_completed_files
            self.newly_completed_files = []
        with self.files_in_progress_lock:
            in_progress_list = list(self.files_in_progress.items())
        if self.status in ["running", "paused"] and self.total_files > 0:
            self.progress_general = (self.files_processed_count / self.total_files) * 100
        batch_elapsed_str = self._format_time(time.time() - self.batch_start_time) if self.batch_start_time else "00:00"
        return {
            "status": self.status,
            "progress_general": self.progress_general,
            "batch_elapsed_str": batch_elapsed_str,
            "total_files": self.total_files,
            "files_processed": self.files_processed_count,
            "files_in_progress": dict(in_progress_list),
            "completed_files": completed_list
        }