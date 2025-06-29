# Conteúdo de app/routes.py
from app import app
from flask import render_template, request, jsonify
import threading
from .transcriber import TranscriptionManager, load_whisper_model

print("Carregando o modelo Whisper na inicialização...")
WHISPER_MODEL = load_whisper_model("base")
print("Modelo carregado e pronto." if WHISPER_MODEL else "ERRO: Modelo não pôde ser carregado.")

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

    # [MODIFICADO] Recebendo os novos parâmetros
    keep_structure = data.get('keep_structure', False) # Default para False se não for enviado
    source_path = data.get('source_path', None)

    if not file_list or not dest_path:
        return jsonify({'status': 'erro', 'message': 'Lista de arquivos ou caminho de destino não fornecidos.'}), 400
    
    # [NOVO] Validação no back-end
    if keep_structure and not source_path:
        return jsonify({'status': 'erro', 'message': 'Pasta de origem não fornecida para manter a estrutura.'}), 400
        
    if not WHISPER_MODEL:
        return jsonify({'status': 'erro', 'message': 'Modelo Whisper não carregado.'}), 500

    # [MODIFICADO] Passando os novos parâmetros para o TranscriptionManager
    transcription_job = TranscriptionManager(
        dest_path=dest_path, 
        model=WHISPER_MODEL,
        file_list=file_list,
        keep_structure=keep_structure,
        source_path=source_path
    )
    process_thread = threading.Thread(target=transcription_job.run_transcription)
    process_thread.start()

    return jsonify({
        'status': 'sucesso',
        'message': 'Processo iniciado.'
    })

@app.route('/stop-processing', methods=['POST'])
def stop_processing():
    """[NOVA ROTA] Endpoint para parar o processo."""
    global transcription_job
    if transcription_job and transcription_job.status == "running":
        transcription_job.request_stop()
        return jsonify({'status': 'sucesso', 'message': 'Sinal de parada enviado.'})
    return jsonify({'status': 'erro', 'message': 'Nenhum processo em andamento para parar.'}), 400

# Rota para a Fase 4
@app.route('/get-progress')
def get_progress():
    global transcription_job
    if transcription_job:
        return jsonify(transcription_job.get_status())
    return jsonify({"status": "idle"})