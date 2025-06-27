import webview
import os
import subprocess
import sys
from tkinter import Tk, filedialog

class Api:
    """
    A 'ponte' que expõe a lógica do back-end para ser chamada pelo JavaScript.
    Os métodos aqui interagem diretamente com o sistema de arquivos do usuário.
    """
    def _initialize_tk(self):
        """Inicializa e oculta a janela raiz do Tkinter."""
        root = Tk()
        root.withdraw()
        return root

    def open_file_dialog(self):
        """
        Abre uma caixa de diálogo nativa para o usuário selecionar um ou mais arquivos.
        Retorna uma lista de caminhos dos arquivos selecionados.
        """
        print("[API] Chamada recebida: open_file_dialog")
        root = self._initialize_tk()
        files = filedialog.askopenfilenames(
            parent=root,
            title='Selecione os arquivos de mídia',
            filetypes=[("Arquivos de Mídia", "*.mp4 *.mov *.avi *.mkv *.mp3 *.wav *.m4a *.flac"), ("Todos os arquivos", "*.*")]
        )
        root.destroy()
        return list(files) if files else []

    def open_folder_dialog(self, title='Selecione uma pasta'):
        """
        Abre uma caixa de diálogo nativa para o usuário selecionar uma pasta.
        Retorna o caminho da pasta selecionada.
        """
        print(f"[API] Chamada recebida: open_folder_dialog com o título: {title}")
        root = self._initialize_tk()
        folder_path = filedialog.askdirectory(parent=root, title=title)
        root.destroy()
        return folder_path if folder_path else None

    def open_folder_in_explorer(self, path):
        """
        Abre o gerenciador de arquivos do sistema operacional no caminho especificado.
        Se o caminho for um arquivo, abre a pasta que o contém.
        """
        print(f"[API] Chamada recebida: open_folder_in_explorer com o caminho: {path}")
        
        # Garante que o caminho seja válido e, se for um arquivo, pega o diretório.
        if os.path.isfile(path):
            path = os.path.dirname(path)

        if not path or not os.path.isdir(path):
            print(f"[ERRO API] Caminho do diretório é inválido ou não existe: {path}")
            return

        # Abre o explorador de arquivos dependendo do sistema operacional.
        if sys.platform == 'win32':
            os.startfile(os.path.realpath(path))
        elif sys.platform == 'darwin': # macOS
            subprocess.Popen(['open', path])
        else: # linux
            subprocess.Popen(['xdg-open', path]) 