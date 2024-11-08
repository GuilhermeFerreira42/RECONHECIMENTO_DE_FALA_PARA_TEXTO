import os
import json
import wave
import subprocess
import threading
from tkinter import Tk, filedialog, Button, Label, Entry, StringVar, Menu, messagebox, DoubleVar, Scrollbar
from tkinter.ttk import Progressbar, Treeview
import vosk
import queue

# Variáveis globais
stop_processing = threading.Event()
process_queue = queue.Queue()
video_counter = 1  # Contador global para os vídeos

# Caminhos para memória persistente
paths_file = "paths.json"

# Função para carregar caminhos salvos
def load_paths():
    if os.path.exists(paths_file):
        with open(paths_file, "r") as f:
            return json.load(f)
    return {"model_path": "", "output_path": ""}

# Função para salvar caminhos
def save_paths(model_path, output_path):
    with open(paths_file, "w") as f:
        json.dump({"model_path": model_path, "output_path": output_path}, f)

def convert_audio(video_path, audio_path):
    command = [
        'ffmpeg', '-i', video_path, '-ar', '16000', '-ac', '1', '-f', 'wav', '-vn', audio_path
    ]
    subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def transcribe_audio(audio_path, model_path, progress_var):
    model = vosk.Model(model_path)
    recognizer = vosk.KaldiRecognizer(model, 16000)

    with wave.open(audio_path, 'rb') as wf:
        frames = wf.getnframes()
        chunk_size = 4000
        num_chunks = frames // chunk_size
        for i in range(num_chunks + 1):
            if stop_processing.is_set():
                break
            data = wf.readframes(chunk_size)
            if len(data) == 0:
                break
            if recognizer.AcceptWaveform(data):
                result = recognizer.Result()
                yield json.loads(result)['text']
            progress_var.set((i + 1) / (num_chunks + 1) * 100)
            root.update_idletasks()  # Atualiza a interface gráfica

    final_result = recognizer.FinalResult()
    yield json.loads(final_result)['text']
    progress_var.set(100)
    root.update_idletasks()

def process_videos(video_paths, model_path, output_dir, progress_var):
    for index, video_path in enumerate(video_paths, start=video_counter):
        if stop_processing.is_set():
            break

        audio_path = os.path.join(output_dir, 'temp_audio.wav')
        video_name = os.path.basename(video_path)
        update_status(index, "Processando")

        convert_audio(video_path, audio_path)

        transcript = []
        for text in transcribe_audio(audio_path, model_path, progress_var):
            transcript.append(text)

        os.remove(audio_path)

        output_path = os.path.join(output_dir, video_name.replace(os.path.splitext(video_name)[1], '.txt'))
        with open(output_path, 'w') as f:
            f.write('\n'.join(transcript))

        update_status(index, "Concluído")

def update_status(index, status):
    for item in video_list.get_children():
        if video_list.item(item, 'values')[0] == index:
            video_list.item(item, values=(index, video_list.item(item, 'values')[1], status))
            break

def start_processing():
    video_paths = [video_list.item(item, 'values')[1] for item in video_list.get_children()]
    model_path = model_var.get()
    output_dir = output_path.get()

    if not video_paths or not model_path or not output_dir:
        messagebox.showwarning("Aviso", "Por favor, preencha todos os campos.")
        return

    progress_var.set(0)  # Reseta a barra de progresso
    stop_processing.clear()  # Clear the stop event before starting

    def worker():
        try:
            process_videos(video_paths, model_path, output_dir, progress_var)
            messagebox.showinfo("Concluído", "O processamento dos vídeos foi concluído com sucesso!")
        except Exception as e:
            messagebox.showerror("Erro", f"Ocorreu um erro: {e}")

    global processing_thread
    processing_thread = threading.Thread(target=worker, daemon=True)
    processing_thread.start()
    messagebox.showinfo("Início", "O processamento dos vídeos foi iniciado.")

def stop_processing_videos():
    stop_processing.set()  # Signal to stop processing
    if processing_thread.is_alive():
        process_queue.put("stop")  # Put a stop message in the queue
        processing_thread.join(timeout=5)  # Espera até 5 segundos para terminar a thread
    messagebox.showinfo("Parado", "O processamento dos vídeos foi interrompido.")

def select_videos():
    global video_counter
    video_paths = filedialog.askopenfilenames(title="Selecione os vídeos", filetypes=[("Todos os arquivos", "*.*")])
    if video_paths:
        for path in video_paths:
            video_list.insert("", "end", values=(video_counter, path, "Não Processado"))
            video_counter += 1  # Incrementa o contador

def select_model():
    model_path = filedialog.askdirectory(title="Selecione o diretório do modelo")
    if model_path:
        model_var.set(model_path)
        save_paths(model_path, output_path.get())

def select_output_dir():
    output_dir = filedialog.askdirectory(title="Selecione o diretório de saída")
    if output_dir:
        output_path.set(output_dir)
        save_paths(model_var.get(), output_dir)

def clear_list():
    global video_counter
    video_list.delete(*video_list.get_children())
    video_counter = 1  # Reinicia o contador

def remove_selected_video():
    selected_items = video_list.selection()
    for item in selected_items:
        video_list.delete(item)

def setup_right_click_menu():
    menu = Menu(root, tearoff=0)
    menu.add_command(label="Remover vídeo selecionado", command=remove_selected_video)
    def show_menu(event):
        menu.post(event.x_root, event.y_root)
    video_list.bind("<Button-3>", show_menu)

def main():
    global video_list, model_var, output_path, progress_var, root, processing_thread

    root = Tk()
    root.title("Conversor de Vídeo para Texto")

    # Carrega caminhos salvos
    saved_paths = load_paths()

    # Botão "Selecionar vídeos"
    Button(root, text="Selecionar vídeos", command=select_videos).pack(pady=5)

    # Configura lista de vídeos com colunas
    video_list = Treeview(root, columns=("Índice", "Caminho", "Status"), show='headings', selectmode="extended")
    video_list.heading("Índice", text="Índice")
    video_list.heading("Caminho", text="Caminho")
    video_list.heading("Status", text="Status")
    video_list.pack(pady=5, fill='both', expand=True)

    # Barra de rolagem
    scrollbar = Scrollbar(root, orient="vertical", command=video_list.yview)
    scrollbar.pack(side='right', fill='y')
    video_list.configure(yscrollcommand=scrollbar.set)

    # Configura menu de clique direito
    setup_right_click_menu()

    # Botão "Selecionar modelo"
    Label(root, text="Selecionar diretório do modelo:").pack(pady=5)
    model_var = StringVar(value=saved_paths.get("model_path", ""))
    Entry(root, textvariable=model_var, state='readonly').pack(pady=5)
    Button(root, text="Selecionar pasta do modelo", command=select_model).pack(pady=5)

    # Campo "Caminho de saída"
    Label(root, text="Caminho de saída:").pack(pady=5)
    output_path = StringVar(value=saved_paths.get("output_path", ""))
    Entry(root, textvariable=output_path).pack(pady=5)
    Button(root, text="Selecionar pasta de saída", command=select_output_dir).pack(pady=5)

    # Botão "Limpar lista"
    Button(root, text="Limpar lista", command=clear_list).pack(pady=5)

    # Barra de progresso
    progress_var = DoubleVar()
    progress = Progressbar(root, orient="horizontal", length=400, mode="determinate", variable=progress_var)
    progress.pack(pady=10)

    # Botão "Executar"
    Button(root, text="Executar", command=start_processing).pack(pady=20)

    # Botão "Parar"
    Button(root, text="Parar", command=stop_processing_videos).pack(pady=5)

    root.mainloop()

if __name__ == "__main__":
    main()
