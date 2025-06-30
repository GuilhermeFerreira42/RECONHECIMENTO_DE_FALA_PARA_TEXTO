# Fluxos de Trabalho do Usuário

Este documento detalha os principais casos de uso do sistema.

### Fluxo 1: Processamento de Pasta Inteira (Principal)

Este é o uso primário da ferramenta, projetado para processar um grande volume de arquivos organizados em pastas.

1.  **Configuração:** O usuário seleciona uma "Pasta de Origem" (contendo os vídeos/áudios) e uma "Pasta de Destino" (onde as transcrições serão salvas).
2.  **Descoberta:** O sistema varre toda a "Pasta de Origem", incluindo todas as subpastas, e lista os arquivos de mídia compatíveis no painel "Arquivos para Processar".
3.  **Execução:** O usuário clica em "INICIAR TRANSCRIÇÃO".
4.  **Lógica de Saída:** Para cada arquivo processado, o sistema recria sua estrutura de pastas original dentro da "Pasta de Destino".
    -   **Exemplo:**
        -   **Origem:** `C:/Curso/Modulo_01/Aula_01_Intro.mp4`
        -   **Destino:** `D:/Textos/Curso/Modulo_01/Aula_01_Intro.txt`

### Fluxo 2: Processamento de Arquivos Individuais

Este fluxo oferece flexibilidade para transcrever arquivos avulsos sem a necessidade de uma estrutura de pastas.

1.  **Adição:** O usuário clica no botão `+ Adicionar Arquivo` e seleciona um ou mais arquivos de qualquer local em seu computador.
2.  **Inclusão na Fila:** Os arquivos são adicionados à lista no painel "Arquivos para Processar".
3.  **Execução:** O usuário clica em "INICIAR TRANSCRIÇÃO".
4.  **Lógica de Saída:** Arquivos adicionados por este método são salvos **diretamente na raiz** da "Pasta de Destino", sem criar subpastas.
    -   **Exemplo:**
        -   **Arquivo Adicionado:** `C:/Downloads/Entrevista_Podcast.mp3`
        -   **Destino:** `D:/Textos/Entrevista_Podcast.txt`

Ambos os fluxos podem ser combinados. O usuário pode carregar uma pasta inteira e, em seguida, adicionar mais arquivos avulsos à mesma fila antes de iniciar o processo.


------

Com certeza. Aqui está o checklist completo do projeto, do início ao fim, com o status atual de cada tarefa baseado em nosso progresso.

---

### **Checklist Geral do Projeto de Transcrição**

#### **Fase 1: Estrutura Inicial do Projeto (Concluída)**
- [x] [cite_start]Definir a arquitetura de pastas (`app/`, `vendor/`, `docs/`). [cite: 50]
- [x] [cite_start]Criar os arquivos iniciais (`run.py`, `__init__.py`, etc.). [cite: 1, 50]
- [x] Configurar o arquivo `.gitignore`.
- [x] Criar o arquivo `requirements.txt` com as dependências Python (Flask, Vosk).
- [x] [cite_start]Baixar e posicionar as dependências externas (FFmpeg) na pasta `vendor/`. [cite: 50]

#### **Fase 2: Motor de Transcrição (Concluída)**
- [x] [cite_start]**Em `transcriber.py`:** Implementar a lógica de escaneamento recursivo de pastas (`scan_files`). [cite: 38]
- [x] [cite_start]**Em `transcriber.py`:** Implementar a lógica de conversão de mídia para `.wav` usando FFmpeg (`convert_to_wav`). [cite: 34]
- [x] [cite_start]**Em `transcriber.py`:** Implementar a lógica de transcrição do arquivo `.wav` usando Vosk. [cite: 42]
- [x] [cite_start]**Em `transcriber.py`:** Garantir que a estrutura de pastas da origem seja espelhada no destino. [cite: 41]
- [x] [cite_start]**Em `transcriber.py`:** Implementar a classe `TranscriptionManager` para encapsular toda a lógica de um trabalho de transcrição. [cite: 36]
- [x] **Em `transcriber.py`:** Corrigir bugs de exclusão de arquivos temporários e nomenclatura.
- [x] **Teste e Validação:** Executar o script `transcriber.py` de forma isolada para confirmar que o processo de transcrição em lote funciona corretamente.

#### **Fase 3: Conexão Front-end e Back-end (Concluída)**
- [x] [cite_start]**Em `index.html`:** Separar o código CSS e JavaScript para arquivos externos (`.css`, `.js`). [cite: 30]
- [x] [cite_start]**Em `routes.py`:** Criar a rota principal (`/`) para servir o `index.html`. [cite: 1]
- [x] **Em `run.py`:** Configurar o script para iniciar a aplicação Flask.
- [x] [cite_start]**Em `routes.py`:** Criar a rota `/start-processing` (método `POST`) para receber os comandos da interface. [cite: 1]
- [x] [cite_start]**Em `routes.py`:** Implementar o uso de `threading.Thread` para que o processo de transcrição rode em segundo plano sem travar a interface. [cite: 3]
- [x] [cite_start]**Em `main.js`:** Adicionar um `event listener` ao botão "INICIAR TRANSCRIÇÃO". [cite: 16]
- [x] [cite_start]**Em `main.js`:** Implementar a chamada `fetch` para enviar os caminhos de origem e destino para a rota `/start-processing`. [cite: 18]
- [x] **Teste e Validação:** Confirmar que o clique no botão na interface inicia o processo no terminal do servidor e que a interface permanece responsiva.

#### **Fase 4: Feedback em Tempo Real (Em Andamento)**
- **Objetivo:** Fazer a interface refletir o progresso do trabalho em tempo real.
- [x] [cite_start]**Back-end:** Refinar a classe `TranscriptionManager` para manter o estado atualizado (progresso geral, arquivo atual, etc.). [cite: 37]
- [x] [cite_start]**Back-end:** Implementar a rota `/get-progress` que retorna o estado atual do trabalho como JSON. [cite: 4]
- [x] **Front-end:** Iniciar o "polling" com `setInterval` em `main.js` após o processo começar.
- [x] **Front-end:** **(BUG ATUAL)** Corrigir a lógica em `main.js` para atualizar a **barra de progresso geral** continuamente, e não apenas ao final de cada arquivo.
- [x] **Front-end:** **(BUG ATUAL)** Corrigir a lógica em `main.js` para exibir a **porcentagem (`X%`)** no status do item atual e preencher sua **barra de progresso individual**.
- [x] **Front-end:** Implementar a lógica para mover um item da lista da esquerda para a lista da direita assim que sua transcrição for concluída.
- [x] **Front-end:** Interromper o `setInterval` (`clearInterval`) quando o status do processo for "completed" ou "error".


#### **Checklist da Fase 5**

  * [x] **1. Ambiente e Dependências**

      * [x] Adicionar `pywebview` ao arquivo `requirements.txt`.
      * [x] Instalar a nova dependência no ambiente de desenvolvimento (`pip install -r requirements.txt`).

  * [x] **2. Criação da API de Interação (A Ponte)**

      * [x] Criar um novo arquivo chamado `app/api.py`.
      * [x] Dentro de `api.py`, definir uma classe Python (ex: `class Api:`).
      * [x] Dentro desta classe, criar os métodos "esqueleto" que o JavaScript precisará chamar. Estes métodos, por enquanto, podem apenas imprimir uma mensagem para confirmar que foram chamados.
          * `def open_file_dialog(self):` (para adicionar arquivos avulsos)
          * `def open_folder_dialog(self):` (para selecionar as pastas de origem/destino)
          * `def open_folder_in_explorer(self, folder_path):` (para a ação "Abrir Local")

  * [x] **3. Reestruturação do Ponto de Entrada (`run.py`)**

      * [x] Modificar `run.py` para que ele não inicie mais o servidor Flask com `app.run()`. Este será o arquivo que lançará a janela do desktop.
      * [x] O script `run.py` será responsável por:
          * Importar o `pywebview`, a `app` do Flask e a nova classe `Api`.
          * Instanciar a nossa API: `api = Api()`.
          * Iniciar o servidor Flask em uma *thread* separada (para que ele não bloqueie a janela da interface).
          * Criar a janela principal da aplicação usando `pywebview.create_window()`, passando:
              * O título da janela (ex: "Painel de Transcrição").
              * A URL da nossa aplicação Flask (`app`).
              * O objeto `api` para que ele seja "injetado" no JavaScript e se torne acessível.

  * [x] **4. Teste e Validação da Arquitetura Híbrida**

      * [x] Executar o novo `run.py`.
      * [x] **Verificar:** A aplicação deve abrir em uma janela de desktop nativa, e não mais em uma aba do navegador.
      * [x] **Verificar:** A interface web deve ser carregada e parecer funcional como antes.
      * [x] **Verificar (passo crucial):** Abrir as ferramentas de desenvolvedor da janela (`pywebview` permite isso em modo debug) e testar no console se o objeto da API está acessível via JavaScript (ex: digitando `window.pywebview.api`).

---


### **Estrutura de Arquivos e Diretórios (Pós-Fase 5)**

Após a conclusão desta fase, a estrutura do seu projeto será ligeiramente modificada para acomodar a nova lógica da aplicação híbrida.

```
TranscricaoApp/
├── README.md
├── app/
│   ├── __init__.py
│   ├── api.py           <-- NOVO ARQUIVO (conterá a ponte JS-Python)
│   ├── routes.py        (continua responsável pelas rotas HTTP internas)
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       ├── main.js
│   │       └── ui.js
│   ├── templates/
│   │   └── index.html
│   └── transcriber.py
│
├── docs/
│   └── ... (sem alterações nesta fase)
│
├── run.py               <-- ARQUIVO SIGNIFICATIVAMENTE MODIFICADO (agora inicia o pywebview)
│
└── requirements.txt     <-- ARQUIVO MODIFICADO (incluirá 'pywebview')
```

Com este plano, ao final da Fase 5, teremos uma base sólida de desktop. A aplicação ainda terá a mesma aparência, mas por "debaixo do capô" ela terá os superpoderes necessários para que, na **Fase 6**, possamos implementar as funcionalidades de interação com o sistema de arquivos de forma simples e direta.

---

### **Fase 6: Funcionalidades Finais e Interatividade (no Ambiente Híbrido)**

Com a ponte de comunicação entre Python e JavaScript estabelecida na Fase 5, agora podemos implementar as funcionalidades de forma poderosa e amigável para o usuário.

#### **Checklist da Fase 6**

 * [x] **1. Lógica da API de Interação (app/api.py)**
   * [x] Implementar a lógica real dos métodos na classe Api usando bibliotecas Python nativas (como tkinter.filedialog, os, subprocess).
     * open_folder_dialog(): Abre um seletor de pastas e retorna o caminho da pasta selecionada.
     * open_file_dialog(): Abre um seletor de arquivos (permitindo múltiplos) e retorna uma lista com os caminhos dos arquivos selecionados.
     * open_folder_in_explorer(path): Recebe um caminho e abre o explorador de arquivos do sistema nesse local.

 * [x] **2. Conexão do Front-End com a API Híbrida e Lógica da Interface**
   * [x] Seleção de Origem/Destino:
     * [x] Adicionar botões "Selecionar Pasta" ao lado dos campos de Origem e Destino no index.html.
     * [x] Em main.js, fazer esses botões chamarem window.pywebview.api.open_folder_dialog().
     * [x] O caminho retornado pela API deve preencher o valor do campo de input correspondente.
   * [x] Botão "+ Adicionar Arquivo":
     * [x] Conectar o botão para que ele chame window.pywebview.api.open_file_dialog().
     * [x] Para cada arquivo retornado pela API, criar dinamicamente um novo item na lista "Arquivos para Processar" usando a função addFileToQueue.
   * [x] Escaneamento de Pasta de Origem (Funcionalidade Adicionada):
     * [x] Back-end: Criar uma nova função em app/api.py (ex: scan_folder_recursively(path)) que recebe um caminho de pasta, usa os.walk para encontrar todos os arquivos de mídia compatíveis e retorna uma lista com os caminhos completos.
     * [x] Front-end: Em main.js, no addEventListener do botão select-origem-btn, após obter o caminho da pasta, chamar a nova função da API (await api.scan_folder_recursively(...)).
     * [x] Front-end: Em main.js, pegar a lista de arquivos retornada pelo Python e usar um loop para chamar a função addFileToQueue(filePath) para cada arquivo, populando a interface.
   * [x] Lógica de Início Modificada:
     * [x] Alterar a função do botão "INICIAR TRANSCRIÇÃO" para que o front-end colete os caminhos da lista e os envie para o back-end.
     * [x] Modificar a rota /start-processing em routes.py para receber uma file_list explícita.

 * [x] **3. Implementação do Menu de Contexto (app/static/js/ui.js)**
   * [x] Ação "Remover da Fila": Implementar a lógica para remover o item selecionado da lista da interface.
   * [x] Ação "Abrir Local do Arquivo":
     * [x] Fazer esta opção chamar window.pywebview.api.open_folder_in_explorer(path).
     * [x] O path a ser aberto deve ser extraído do item da lista.

 * [x] **4. Controles de Processo e Limpeza**
   * [x] Botão "PARAR PROCESSO": Conectar o botão para fazer um fetch a uma nova rota /stop-processing para interromper o trabalho em andamento no back-end.
   * [x] Botões "Limpar Fila" e "Limpar Concluídos": Implementar a lógica em main.js para limpar o conteúdo das listas da interface.
