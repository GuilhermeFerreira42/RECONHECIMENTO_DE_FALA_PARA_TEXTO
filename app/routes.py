# Conteúdo de app/routes.py
from app import app
from flask import render_template, request, jsonify
import threading
from .transcriber import TranscriptionManager, load_vosk_model

print("Carregando o modelo Vosk na inicialização...")
VOSK_MODEL = load_vosk_model()
print("Modelo carregado e pronto." if VOSK_MODEL else "ERRO: Modelo não pôde ser carregado.")

transcription_job = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start-processing', methods=['POST'])
def start_processing():
    global transcription_job
    data = request.get_json()
    source_path = data.get('source_path')
    dest_path = data.get('dest_path')

    if not source_path or not dest_path:
        return jsonify({'status': 'erro', 'message': 'Caminhos não fornecidos.'}), 400
    if not VOSK_MODEL:
        return jsonify({'status': 'erro', 'message': 'Modelo Vosk não carregado.'}), 500

    # Cria a instância e ESCANEIA os arquivos imediatamente
    transcription_job = TranscriptionManager(source_path, dest_path, VOSK_MODEL)
    transcription_job.scan_files() # Escaneia os arquivos antes de iniciar a thread
    initial_file_list = transcription_job.get_file_list()

    # Inicia o processamento pesado em segundo plano
    process_thread = threading.Thread(target=transcription_job.run_transcription) # Renomeado
    process_thread.start()

    # Retorna sucesso E a lista inicial de arquivos para o front-end
    return jsonify({
        'status': 'sucesso',
        'message': 'Processo iniciado.',
        'files': initial_file_list
    })

# Rota para a Fase 4
@app.route('/get-progress')
def get_progress():
    global transcription_job
    if transcription_job:
        return jsonify(transcription_job.get_status())
    return jsonify({"status": "idle"})