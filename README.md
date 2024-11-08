# Conversor de Vídeo para Texto com Reconhecimento de Fala


## Descrição

Este programa converte vídeos em arquivos de texto usando reconhecimento de fala. Ele extrai o áudio do vídeo, converte o áudio para uma taxa de amostragem de 16 kHz, e utiliza um modelo de reconhecimento de fala para transcrever o áudio em texto. A transcrição é então salva em um arquivo de texto. O programa inclui uma interface gráfica para facilitar a seleção dos arquivos e do modelo de reconhecimento de fala, bem como exibe uma barra de progresso durante o processamento.

## Funcionalidades

- **Conversão de Áudio**: Extrai o áudio de um vídeo e converte a taxa de amostragem para 16 kHz.
- **Reconhecimento de Fala**: Utiliza o modelo Vosk para transcrever o áudio em texto.
- **Interface Gráfica**: Permite ao usuário selecionar o arquivo de vídeo e o modelo de reconhecimento de fala através de uma interface gráfica.
- **Barra de Progresso**: Exibe o progresso da conversão de áudio para texto.
- **Salvamento de Transcrição**: Salva a transcrição em um arquivo de texto.

## Dependências

Antes de executar o programa, você precisa instalar as seguintes dependências:

1. **FFmpeg**: Baixe e instale o FFmpeg a partir do site oficial [FFmpeg](https://ffmpeg.org/download.html) e adicione o executável `ffmpeg.exe` ao seu PATH do sistema.

2. **Bibliotecas Python**:
```markdown 
   pip install vosk tqdm
   ```

   - **vosk**: Biblioteca para reconhecimento de fala.
   - **tqdm**: Biblioteca para exibir a barra de progresso.

3. **Biblioteca Tkinter**: Incluída com a instalação padrão do Python. No entanto, se necessário, você pode instalar usando:
   ```bash
   pip install tk
   ```

4. **Bibliotecas para manipulação de arquivos**:
   - **subprocess**: Para executar comandos do sistema.
   - **wave**: Para manipulação de arquivos WAV.
   - **json**: Para manipulação de dados JSON.

5. **Modelo de Reconhecimento de Fala**: Faça o download do modelo Vosk em português no site [Vosk Models](https://alphacephei.com/vosk/models) e extraia o conteúdo para uma pasta acessível.

## Instruções de Uso

1. Execute o script Python.
2. Use a interface gráfica para selecionar o arquivo de vídeo e o modelo de reconhecimento de fala.
3. O programa extrairá o áudio do vídeo, converterá para a taxa de amostragem apropriada e transcreverá o áudio em texto.
4. A transcrição será salva em um arquivo de texto na mesma pasta do vídeo.

## Código-Fonte

```python
import os
import json
import wave
import subprocess
from tkinter import Tk, filedialog, Button, Label
from tqdm import tqdm
import vosk

def convert_audio(video_path, audio_path):
    command = [
        'ffmpeg', '-i', video_path, '-ar', '16000', '-ac', '1', audio_path
    ]
    subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def transcribe_audio(audio_path, model_path):
    model = vosk.Model(model_path)
    recognizer = vosk.KaldiRecognizer(model, 16000)

    with wave.open(audio_path, 'rb') as wf:
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if recognizer.AcceptWaveform(data):
                result = recognizer.Result()
                yield json.loads(result)['text']

    final_result = recognizer.FinalResult()
    yield json.loads(final_result)['text']

def process_video():
    video_path = filedialog.askopenfilename(title="Selecione o vídeo", filetypes=[("Vídeo", "*.mp4")])
    model_path = filedialog.askdirectory(title="Selecione o caminho do modelo")
    
    if not video_path or not model_path:
        return

    audio_path = os.path.join(os.path.dirname(video_path), 'temp_audio.wav')
    convert_audio(video_path, audio_path)

    transcript = []
    for text in transcribe_audio(audio_path, model_path):
        transcript.append(text)

    os.remove(audio_path)
    
    output_path = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Texto", "*.txt")])
    with open(output_path, 'w') as f:
        f.write('\n'.join(transcript))

def main():
    root = Tk()
    root.title("Conversor de Vídeo para Texto")
    
    Button(root, text="Selecionar Vídeo e Modelo", command=process_video).pack(pady=20)
    
    root.mainloop()

if __name__ == "__main__":
    main()
```

---

# Manual de Instalação

Este manual vai guiá-lo através da instalação de todas as ferramentas e bibliotecas necessárias para executar o programa que converte vídeos em texto usando o Vosk. Siga cada passo com atenção.

## 1. Instalar Python

### Baixar Python
1. Acesse [Python.org](https://www.python.org/downloads/).
2. Clique em "Download Python 3.x.x" (a versão mais recente).
3. Execute o instalador baixado e certifique-se de marcar a opção "Add Python to PATH" antes de clicar em "Install Now".

## 2. Instalar FFmpeg

### Baixar FFmpeg
1. Acesse [FFmpeg Downloads](https://ffmpeg.org/download.html).
2. Escolha a versão compatível com o seu sistema operacional e faça o download.

### Instalar FFmpeg
1. Extraia o arquivo baixado.
2. Copie o executável `ffmpeg.exe` (geralmente encontrado na pasta `bin` dentro do diretório extraído).
3. Cole o `ffmpeg.exe` em um diretório de sua escolha, por exemplo, `C:\ffmpeg`.

### Adicionar FFmpeg ao PATH
1. Pressione `Win + R`, digite `sysdm.cpl` e pressione Enter para abrir Propriedades do Sistema.
2. Clique na guia "Avançado" e depois em "Variáveis de Ambiente".
3. Encontre a variável `Path` na seção "Variáveis do sistema" e clique em "Editar".
4. Clique em "Novo" e adicione o caminho do diretório onde você colocou o `ffmpeg.exe`, por exemplo, `C:\ffmpeg`.
5. Clique em "OK" para fechar todas as janelas.

## 3. Baixar e Instalar o Modelo Vosk

### Baixar o Modelo
1. Acesse [Vosk Models](https://alphacephei.com/vosk/models).
2. Escolha o modelo desejado (por exemplo, o modelo de português).
3. Baixe o arquivo do modelo.

### Instalar o Modelo
1. Extraia o arquivo do modelo para um diretório acessível no seu computador, por exemplo, `C:\VoskModel`.

## 4. Instalar Bibliotecas Python

### Abrir o Terminal ou Prompt de Comando
1. No Windows, você pode usar o Prompt de Comando. Pressione `Win + R`, digite `cmd` e pressione Enter.

### Instalar as Bibliotecas
1. No terminal, digite os seguintes comandos e pressione Enter após cada um:

    ```bash
    pip install vosk tqdm
    ```

   Isso instalará as bibliotecas necessárias para a transcrição e a barra de progresso.

## 5. Executar o Programa

### Preparar o Programa
1. Certifique-se de que o código Python do programa está salvo em um arquivo, por exemplo, `converte_video_txt.py`.

### Executar o Programa
1. No terminal, navegue até o diretório onde o arquivo do programa está salvo.
2. Execute o programa com o seguinte comando:

    ```bash
    python converte_video_txt.py
    ```

   Isso abrirá a interface gráfica do programa, onde você poderá selecionar o vídeo, o modelo e o local para salvar a transcrição.




Para mais detalhes e atualizações, consulte a [documentação do projeto](https://www.instagram.com/guilhermeduarteh/).
