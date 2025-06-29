# Conteúdo completo e CORRIGIDO de app/transcriber.py

import os
import sys
import subprocess
import threading
from pathlib import Path
import whisper
import torch
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
    def __init__(self, dest_path, model, file_list, keep_structure=False, source_path=None):
        self.dest_path = Path(dest_path)
        self.model = model
        self.files_to_process = file_list
        self.total_files = len(file_list)
        self.files_processed_count = 0
        self.status = "idle"
        self.progress_general = 0
        self.current_file_info = {"filename": "", "progress": 0, "full_path": ""}
        self.stop_requested = False
        self.keep_structure = keep_structure
        self.source_path = Path(source_path) if source_path else None

    def request_stop(self):
        print("[AVISO] Solicitação de parada recebida.")
        self.stop_requested = True

    def _transcribe_single_file(self, file_path_str):
        file_path = Path(file_path_str)
        base_name = file_path.name

        self.current_file_info = {
            "filename": base_name,
            "progress": 0,
            "full_path": file_path_str
        }
        print(f"\n--- Processando: {base_name} ---")

        # A lógica de criação de pastas de destino permanece a mesma
        output_txt_path_obj = None
        if self.keep_structure and self.source_path and file_path.is_relative_to(self.source_path):
            relative_path = file_path.relative_to(self.source_path)
            output_txt_path_obj = self.dest_path / relative_path.with_suffix('.txt')
        else:
            output_txt_path_obj = self.dest_path / file_path.with_suffix('.txt').name

        output_txt_path_obj.parent.mkdir(parents=True, exist_ok=True)

        temp_wav_file = self.dest_path / f"temp_{file_path.stem}.wav"

        # Etapa 1: Conversão para WAV (10% do progresso)
        print("    -> Convertendo para WAV...")
        self.current_file_info["progress"] = 5
        if not convert_to_wav(str(file_path), str(temp_wav_file)):
            self.current_file_info["progress"] = "Erro na conversão"
            return
        
        self.current_file_info["progress"] = 10
        print("    -> Conversão concluída.")

        # Etapa 2: Transcrição com Whisper (80% do progresso)
        print("     -> Transcrevendo áudio com Whisper...")
        transcript_text = None
        
        # Estimar tempo de transcrição baseado no tamanho do arquivo
        try:
            file_size_mb = temp_wav_file.stat().st_size / (1024 * 1024)
            # Estimativa: ~1MB por minuto de áudio, processamento ~2x mais rápido que tempo real
            estimated_duration_seconds = file_size_mb * 30  # Estimativa aproximada
            progress_update_interval = max(1, estimated_duration_seconds / 20)  # 20 atualizações durante a transcrição
            
            print(f"    -> Arquivo estimado: {file_size_mb:.1f}MB, tempo estimado: {estimated_duration_seconds:.1f}s")
            
        except Exception as e:
            print(f"    -> Não foi possível estimar tempo: {e}")
            progress_update_interval = 2  # Fallback: atualizar a cada 2 segundos
            estimated_duration_seconds = 60  # Fallback: 60 segundos
        
        try:
            if self.stop_requested:
                print("    -> Parada detectada antes da transcrição.")
                return

            # Iniciar thread de simulação de progresso
            progress_thread = None
            progress_start_time = time.time()
            
            def simulate_progress():
                nonlocal progress_thread
                while not self.stop_requested and self.current_file_info["progress"] < 90:
                    time.sleep(progress_update_interval)
                    if self.stop_requested:
                        break
                    
                    elapsed_time = time.time() - progress_start_time
                    # Simular progresso de 10% a 90% durante a transcrição
                    progress_percentage = min(90, 10 + int((elapsed_time / estimated_duration_seconds) * 80))
                    self.current_file_info["progress"] = progress_percentage
            
            # Iniciar simulação de progresso
            progress_thread = threading.Thread(target=simulate_progress)
            progress_thread.daemon = True
            progress_thread.start()

            # Executar a transcrição do Whisper
            result = self.model.transcribe(str(temp_wav_file), language='pt', fp16=torch.cuda.is_available())
            transcript_text = result['text'].strip()

            # Aguardar thread de progresso terminar
            if progress_thread and progress_thread.is_alive():
                progress_thread.join(timeout=1)

            self.current_file_info["progress"] = 95
            print("     -> Transcrição concluída.")

        except Exception as e:
            print(f"[ERRO] Falha ao transcrever com o Whisper: {e}")
            self.current_file_info["progress"] = "Erro na transcrição"
            return

        # Etapa 3: Salvamento do arquivo (10% do progresso)
        if transcript_text and not self.stop_requested:
            self.current_file_info["progress"] = 98
            with open(output_txt_path_obj, 'w', encoding='utf-8') as f:
                f.write(transcript_text)
            print(f"    -> Salvo em: {output_txt_path_obj}")
        else:
            print(f"    -> Nenhuma transcrição gerada ou processo interrompido. Arquivo de texto não foi salvo.")

        # Limpeza final
        try:
            os.remove(temp_wav_file)
            print(f"    -> Arquivo temporário removido.")
        except OSError as e:
            print(f"[ERRO] Não foi possível remover o arquivo temporário {temp_wav_file}: {e}")

        # Progresso final
        self.current_file_info["progress"] = 100

    def run_transcription(self):
        if not self.model:
            self.status = "error"
            print("[ERRO] Modelo Whisper não está carregado.")
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

def load_whisper_model(model_name="base"):
    """
    Carrega um modelo do Whisper especificado.
    Modelos disponíveis: tiny, base, small, medium, large.
    """
    print(f"Carregando o modelo Whisper: {model_name}...")
    try:
        model = whisper.load_model(model_name)
        print(f"Modelo {model_name} carregado com sucesso.")
        return model
    except Exception as e:
        print(f"Erro ao carregar modelo Whisper: {e}")
        return None