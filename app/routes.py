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

    print(f"[*] Rota /start-processing acionada.")
    
    transcription_job = TranscriptionManager(source_path, dest_path, VOSK_MODEL)
    
    process_thread = threading.Thread(target=transcription_job.run)
    process_thread.start()

    response_data = {'status': 'sucesso', 'message': 'Processo iniciado em segundo plano.'}
    print(f"[*] Enviando resposta para o navegador: {response_data}") # PRINT DE DEPURAÇÃO
    
    return jsonify(response_data)

# Rota para a Fase 4
@app.route('/get-progress')
def get_progress():
    global transcription_job
    if transcription_job:
        return jsonify(transcription_job.get_status())
    return jsonify({"status": "idle"})