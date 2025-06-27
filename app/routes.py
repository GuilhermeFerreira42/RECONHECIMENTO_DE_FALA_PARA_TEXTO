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
    file_list = data.get('file_list')
    dest_path = data.get('dest_path')

    if not file_list or not dest_path:
        return jsonify({'status': 'erro', 'message': 'Lista de arquivos ou caminho de destino não fornecidos.'}), 400
    if not VOSK_MODEL:
        return jsonify({'status': 'erro', 'message': 'Modelo Vosk não carregado.'}), 500

    transcription_job = TranscriptionManager(dest_path, VOSK_MODEL, file_list)
    process_thread = threading.Thread(target=transcription_job.run_transcription)
    process_thread.start()

    return jsonify({
        'status': 'sucesso',
        'message': 'Processo iniciado.'
    })

# Rota para a Fase 4
@app.route('/get-progress')
def get_progress():
    global transcription_job
    if transcription_job:
        return jsonify(transcription_job.get_status())
    return jsonify({"status": "idle"})