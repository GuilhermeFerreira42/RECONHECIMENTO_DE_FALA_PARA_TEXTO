# Conteúdo de app/routes.py
from app import app
from flask import render_template, request, jsonify
import threading
from .transcriber import TranscriptionManager, ModelManager

# Crie uma instância única do gerenciador de modelos
model_manager = ModelManager()
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
    keep_structure = data.get('keep_structure', False)
    source_path = data.get('source_path', None)
    
    # NOVO: Recebe o nome do modelo do front-end
    model_name = data.get('model_name', 'whisper_base') # Padrão para 'whisper_base'

    if not file_list or not dest_path:
        return jsonify({'status': 'erro', 'message': 'Lista de arquivos ou caminho de destino não fornecidos.'}), 400
    
    # [NOVO] Validação no back-end
    if keep_structure and not source_path:
        return jsonify({'status': 'erro', 'message': 'Pasta de origem não fornecida para manter a estrutura.'}), 400

    # MODIFICADO: Passe o model_name e o model_manager para o TranscriptionManager
    transcription_job = TranscriptionManager(
        dest_path=dest_path,
        model_name=model_name,
        file_list=file_list,
        model_manager=model_manager,
        keep_structure=keep_structure,
        source_path=source_path
    )
    process_thread = threading.Thread(target=transcription_job.run_transcription)
    process_thread.start()

    return jsonify({
        'status': 'sucesso',
        'message': f'Processo iniciado com o modelo {model_name}.'
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