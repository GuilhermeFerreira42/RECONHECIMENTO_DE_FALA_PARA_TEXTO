# Conteúdo de app/routes.py
from app import app
from flask import render_template, request, jsonify
import threading
from .transcriber import TranscriptionManager, ModelManager

# --- GERENCIAMENTO DE ESTADO GLOBAL ---
model_manager = ModelManager()
transcription_job = None
app_settings = {
    "max_concurrent_tasks": 1,
    "verbose_log": False,
    "post_processing_action": "none" # 'none', 'open_folder', 'shutdown'
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start-processing', methods=['POST'])
def start_processing():
    global transcription_job
    if transcription_job and transcription_job.status in ["running", "paused"]:
        return jsonify({'status': 'erro', 'message': 'Um processo já está em andamento.'}), 400

    data = request.get_json()
    file_list = data.get('file_list') # file_list agora é uma lista de objetos
    dest_path = data.get('dest_path')
    model_name = data.get('model_name', 'whisper_base')
    keep_structure = data.get('keep_structure', False)
    
    # REMOVIDO: source_path não é mais recebido diretamente
    # source_path = data.get('source_path', None) 

    if not file_list or not dest_path:
        return jsonify({'status': 'erro', 'message': 'Lista de arquivos ou destino não fornecidos.'}), 400
    
    transcription_job = TranscriptionManager(
        dest_path=dest_path,
        model_name=model_name,
        file_list=file_list, # Passa a lista de objetos
        model_manager=model_manager,
        keep_structure=keep_structure,
        # REMOVIDO: source_path não é mais um parâmetro único
        # source_path=source_path, 
        max_concurrent_tasks=app_settings.get('max_concurrent_tasks', 1)
    )
    process_thread = threading.Thread(target=transcription_job.run_transcription, daemon=True)
    process_thread.start()

    return jsonify({'status': 'sucesso', 'message': 'Processo iniciado.'})

@app.route('/prioritize-file', methods=['POST'])
def prioritize_file():
    global transcription_job
    data = request.get_json()
    file_path = data.get('file_path')
    if transcription_job and file_path:
        transcription_job.prioritize_file(file_path)
        return jsonify({'status': 'sucesso', 'message': f'Arquivo priorizado: {file_path}'})
    return jsonify({'status': 'erro', 'message': 'Arquivo não encontrado ou processo não iniciado.'}), 400

@app.route('/stop-processing', methods=['POST'])
def stop_processing():
    global transcription_job
    if transcription_job and transcription_job.status in ["running", "paused"]:
        transcription_job.request_stop()
        return jsonify({'status': 'sucesso', 'message': 'Sinal de parada enviado.'})
    return jsonify({'status': 'erro', 'message': 'Nenhum processo para parar.'}), 400

@app.route('/pause-processing', methods=['POST'])
def pause_processing():
    global transcription_job
    if transcription_job and transcription_job.status == "running":
        transcription_job.request_pause()
        return jsonify({'status': 'sucesso', 'message': 'Processo pausado.'})
    return jsonify({'status': 'erro', 'message': 'Nenhum processo rodando para pausar.'}), 400

@app.route('/resume-processing', methods=['POST'])
def resume_processing():
    global transcription_job
    if transcription_job and transcription_job.status == "paused":
        transcription_job.request_resume()
        return jsonify({'status': 'sucesso', 'message': 'Processo retomado.'})
    return jsonify({'status': 'erro', 'message': 'Nenhum processo pausado para retomar.'}), 400

@app.route('/pause-file', methods=['POST'])
def pause_file():
    global transcription_job
    data = request.get_json()
    file_path = data.get('file_path')
    if transcription_job and file_path:
        transcription_job.request_pause_file(file_path)
        return jsonify({'status': 'sucesso', 'message': f'Arquivo pausado: {file_path}'})
    return jsonify({'status': 'erro', 'message': 'Arquivo não encontrado ou processo não iniciado.'}), 400

@app.route('/get-progress')
def get_progress():
    global transcription_job
    if transcription_job:
        return jsonify(transcription_job.get_status())
    # ATUALIZADO: Estado inicial mais completo
    return jsonify({
        "status": "idle", 
        "files_in_progress": {}, 
        "completed_files": [],
        "progress_general": 0,
        "total_files": 0,
        "files_processed": 0,
        "batch_elapsed_str": "00:00"
    })

@app.route('/update-settings', methods=['POST'])
def update_settings():
    global app_settings
    data = request.get_json()
    if 'max_concurrent_tasks' in data:
        try:
            val = int(data['max_concurrent_tasks'])
            app_settings['max_concurrent_tasks'] = max(1, min(val, 16)) # Limita entre 1 e 16
        except (ValueError, TypeError):
            pass # Ignora valores inválidos
    
    print(f"[SETTINGS] Configurações atualizadas: {app_settings}")
    return jsonify({'status': 'sucesso', 'settings': app_settings})

@app.route('/get-settings', methods=['GET'])
def get_settings():
    return jsonify(app_settings)