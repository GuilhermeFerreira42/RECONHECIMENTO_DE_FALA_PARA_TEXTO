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
        ffmpeg_path, '-i', media_path, '-ar', '16000', '-ac', '1',
        '-c:a', 'pcm_s16le', '-y', temp_wav_path
    ]
    try:
        # Esconde a saída do ffmpeg para um terminal mais limpo
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERRO] Falha na conversão do FFmpeg para {media_path}: {e}")
        return False

# --- CLASSE GERENCIADORA ---

class TranscriptionManager:
    def __init__(self, source_path, dest_path, model):
        self.source_path = source_path
        self.dest_path = dest_path
        self.model = model
        self.files_to_process = []
        self.total_files = 0
        self.files_processed_count = 0
        self.status = "idle"
        self.progress_general = 0
        self.current_file_info = {"filename": "", "progress": 0}

    def scan_files(self):
        self.status = "scanning"
        print(f"[*] Iniciando varredura em: {self.source_path}")
        scanned_files = []
        for root, _, files in os.walk(self.source_path):
            for file in files:
                if file.lower().endswith(SUPPORTED_EXTENSIONS):
                    full_path = os.path.join(root, file)
                    scanned_files.append(full_path)
        
        self.files_to_process = scanned_files
        self.total_files = len(scanned_files)
        print(f"[*] Varredura concluída. {self.total_files} arquivos encontrados.")

    # --- MÉTODO ATUALIZADO ---
    def _transcribe_single_file(self, file_path):
        """Lógica para transcrever um único arquivo com correções."""
        self.current_file_info["filename"] = os.path.basename(file_path)
        self.current_file_info["progress"] = 0
        
        print(f"\n--- Processando: {file_path} ---")
        
        relative_path = os.path.relpath(file_path, self.source_path)
        output_txt_path_obj = Path(self.dest_path) / Path(relative_path).with_suffix('.txt')
        output_txt_path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        # Correção 2: Usa .stem para pegar o nome sem a extensão
        file_stem = Path(file_path).stem
        temp_wav_file = Path(self.dest_path) / f"temp_{file_stem}.wav"

        print("    -> Convertendo para WAV...")
        if not convert_to_wav(file_path, str(temp_wav_file)):
            return

        print("    -> Transcrevendo áudio...")
        transcript_text = None
        
        # Correção 1: Usa o 'with' para garantir que o arquivo seja fechado
        try:
            with wave.open(str(temp_wav_file), "rb") as wf:
                recognizer = vosk.KaldiRecognizer(self.model, wf.getframerate())
                
                full_transcript = []
                while True:
                    data = wf.readframes(4000)
                    if len(data) == 0:
                        break
                    recognizer.AcceptWaveform(data)
                
                final_result = json.loads(recognizer.FinalResult())
                full_transcript.append(final_result['text'])
                transcript_text = ' '.join(full_transcript).strip()
        except Exception as e:
            print(f"[ERRO] Falha ao ler ou transcrever o arquivo WAV: {e}")
        
        # Salva o texto se a transcrição foi bem-sucedida
        if transcript_text is not None:
            with open(output_txt_path_obj, 'w', encoding='utf-8') as f:
                f.write(transcript_text)
            print(f"    -> Salvo em: {output_txt_path_obj}")

        # O 'with' já fechou o arquivo, agora a remoção é mais segura
        try:
            os.remove(temp_wav_file)
            print(f"    -> Arquivo temporário removido.")
        except OSError as e:
            print(f"[ERRO] Não foi possível remover o arquivo temporário {temp_wav_file}: {e}")

    def run(self):
        """Ponto de entrada para iniciar o processo de transcrição em lote."""
        if not self.model:
            self.status = "error"
            print("[ERRO] Modelo Vosk não está carregado.")
            return

        self.scan_files()
        
        if not self.files_to_process:
            self.status = "completed"
            print("[AVISO] Nenhum arquivo de mídia encontrado.")
            return

        self.status = "running"
        self.files_processed_count = 0
        
        for file_path in self.files_to_process:
            try:
                self._transcribe_single_file(file_path)
            except Exception as e:
                print(f"[ERRO GERAL] Falha ao processar {file_path}: {e}")
            
            self.files_processed_count += 1
            self.progress_general = int((self.files_processed_count / self.total_files) * 100)
            print(f"Progresso Geral: {self.progress_general}%")

        self.status = "completed"
        self.current_file_info = {"filename": "Processo finalizado!", "progress": 100}
        print("\n" + "="*50)
        print("PROCESSO DE TRANSCRIÇÃO CONCLUÍDO")
        print("="*50)

    def get_status(self):
        return {
            "status": self.status,
            "progress_general": self.progress_general,
            "total_files": self.total_files,
            "files_processed": self.files_processed_count,
            "current_file": self.current_file_info["filename"]
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