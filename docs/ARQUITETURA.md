# Arquitetura do Sistema

Este documento descreve a arquitetura de alto nível do Painel de Transcrição, explicando como seus componentes principais interagem.

O sistema é dividido em três camadas principais:

### 1. Front-end (Interface do Usuário)

-   **Tecnologia:** HTML, TailwindCSS, JavaScript.
-   **Responsabilidade:** Apresentar a interface visual para o usuário em uma única página (SPA - Single Page Application).
-   **`index.html`:** Define a estrutura de dois painéis (Fila e Concluídos) e a barra de controle superior.
-   **`main.js`:** Gerencia a lógica de comunicação com o back-end. Ele captura os cliques nos botões (Iniciar, Parar), envia requisições `fetch` para a API Flask e inicia o processo de "polling" (sondagem) para atualizações de progresso.
-   **`ui.js`:** Controla elementos puramente visuais da interface, como o menu de contexto.

### 2. Back-end (Servidor Web - API)

-   **Tecnologia:** Python, Flask.
-   **Responsabilidade:** Servir a página web e expor uma API RESTful para o front-end. Ele atua como um "controlador" que recebe comandos da interface e os delega para a camada de lógica.
-   **`run.py`:** Ponto de entrada que inicia o servidor Flask.
-   **`app/routes.py`:** Define os endpoints da API, como `/start-processing` e `/get-progress`. Ele não contém a lógica de negócio, apenas recebe as requisições, chama as funções apropriadas da camada de lógica e formata a resposta como JSON.
-   **Threading:** A rota `/start-processing` inicia o trabalho pesado em uma **thread separada**. Isso é crucial para que a interface não trave e o servidor possa continuar respondendo a outras requisições (como as de progresso).

### 3. Core Logic (Motor de Transcrição)

-   **Tecnologia:** Python (módulos `os`, `subprocess`, `pathlib`, `vosk`, `wave`).
-   **Responsabilidade:** Executar todas as operações de processamento de arquivos.
-   **`app/transcriber.py`:** Contém a classe `TranscriptionManager`.
    -   **`TranscriptionManager`:** Gerencia um trabalho de transcrição do início ao fim. Ela é responsável por:
        1.  Escanear as pastas de forma recursiva (`scan_files`).
        2.  Chamar o **FFmpeg** para converter os arquivos para o formato WAV (`convert_to_wav`).
        3.  Usar a biblioteca **Vosk** para realizar a transcrição do áudio.
        4.  Criar a estrutura de pastas espelhada no destino.
        5.  Manter e atualizar o estado do processo (progresso, arquivo atual, etc.), que é consultado pela API.