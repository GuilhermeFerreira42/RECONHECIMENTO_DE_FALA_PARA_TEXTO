# Painel de Transcrição em Lote

Este é um aplicativo de desktop com interface web, construído em Python e Flask, para transcrever múltiplos arquivos de áudio e vídeo de forma automatizada. A ferramenta é ideal para processar grandes volumes de conteúdo, como módulos de cursos, palestras ou entrevistas, mantendo a organização original das pastas.

## Features Principais

-   **Processamento em Lote:** Transcreva uma pasta inteira, incluindo todas as suas subpastas, com um único comando.
-   **Estrutura de Pastas Espelhada:** A estrutura de diretórios da sua pasta de origem é perfeitamente replicada na pasta de destino, substituindo os arquivos de mídia por suas transcrições em `.txt`.
-   **Feedback em Tempo Real:** Acompanhe o progresso geral e o status de cada arquivo individualmente através da interface web.
-   **Flexibilidade:** Adicione arquivos avulsos de qualquer local para serem processados junto com o lote principal.
-   **Autocontido:** As dependências externas como o FFmpeg são empacotadas no projeto para facilitar a instalação e o uso (requer download do modelo de linguagem).

## Pré-requisitos

-   Python 3.8 ou superior
-   Git (para clonar o repositório)

## Como Instalar e Rodar (Quick Start)

1.  **Clone o Repositório:**
    ```bash
    git clone [URL_DO_SEU_REPOSITORIO_GIT]
    cd TranscricaoApp
    ```

2.  **Instale as Dependências Python:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure as Dependências Externas:**
    * **FFmpeg:** O projeto já inclui o executável para Windows, Linux e macOS na pasta `vendor/ffmpeg/`. Nenhuma ação é necessária.
    * **Modelo de Linguagem (Vosk):**
        * Baixe um modelo de linguagem do [site oficial do Vosk](https://alphacephei.com/vosk/models) (recomenda-se um modelo de português).
        * Descompacte o arquivo baixado.
        * Copie o **conteúdo** da pasta do modelo (arquivos como `am`, `conf`, `graph`, etc.) para dentro da pasta `vendor/vosk-model/` no seu projeto.

4.  **Execute a Aplicação:**
    ```bash
    python run.py
    ```

5.  **Acesse a Interface:**
    * Abra seu navegador e acesse o endereço: `http://127.0.0.1:5000`

## Estrutura do Projeto

```
TranscricaoApp/
├── app/                # Contém o código principal da aplicação Flask
│   ├── static/         # Arquivos CSS e JavaScript
│   ├── templates/      # Arquivos HTML
│   ├── transcriber.py  # A lógica principal de transcrição
│   └── routes.py       # As rotas da API do Flask
│
├── docs/               # Documentação detalhada do projeto
│
├── vendor/             # Dependências externas (FFmpeg, Modelo Vosk)
│
├── run.py              # Ponto de entrada para iniciar a aplicação
└── requirements.txt    # Lista de bibliotecas Python
```