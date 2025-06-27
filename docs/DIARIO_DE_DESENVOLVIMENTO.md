# Diário de Desenvolvimento e Próximos Passos

Este documento serve como um log do progresso do projeto, organizado por fases.
---

### **Fase 1: Estrutura Inicial do Projeto (Concluída)**

-   **Objetivo:** Definir uma arquitetura de pastas limpa e profissional para a aplicação Flask.
-   **Realizações:**
    -   Criada a estrutura de diretórios com separação clara entre `app`, `vendor` e `docs`.
    -   Configurado o `requirements.txt` e o `.gitignore`.
    -   Definido um plano de desenvolvimento em fases.

---

### **Fase 2: Motor de Transcrição (Concluída)**

-   **Objetivo:** Desenvolver e validar a lógica principal de transcrição de forma isolada.
-   **Realizações:**
    -   Implementada a classe `TranscriptionManager` em `app/transcriber.py`.
    -   Função de escaneamento recursivo de pastas funciona corretamente.
    -   Integração com o FFmpeg (via `vendor`) para conversão de áudio está funcional.
    -   Lógica de transcrição com Vosk implementada.
    -   Criação da estrutura de pastas espelhada no destino foi validada.

---

### **Fase 3: Conexão Front-end e Back-end (Concluída)**

-   **Objetivo:** Permitir que a interface gráfica inicie o processo de transcrição no servidor.
-   **Realizações:**
    -   Arquivos CSS e JavaScript foram separados do HTML.
    -   O botão "INICIAR TRANSCRIÇÃO" agora envia uma requisição `fetch` para o back-end.
    -   A rota `/start-processing` recebe a requisição e inicia o processo em uma thread separada, mantendo a interface responsiva.

---

### **Fase 4: Feedback em Tempo Real (Concluída)**

-   **Objetivo:** Exibir o progresso da transcrição na interface em tempo real.
-   **Realizações:**
    -   Implementada a rota `/get-progress` para fornecer o status detalhado do trabalho (progresso geral, arquivo atual e progresso individual).
    -   Front-end utiliza `setInterval` para fazer polling contínuo ao back-end.
    -   Barras de progresso (geral e individual) e textos de status são atualizados dinamicamente.
    -   **Resolvida uma condição de corrida de manipulação do DOM**, implementando uma fila de espera no JavaScript para mover os itens de forma estável e incremental da lista "Para Processar" para "Processados".
    -   O polling é interrompido (`clearInterval`) corretamente ao final do processo.

---

#### **Checklist da Fase 5**

  * [ ] **1. Ambiente e Dependências**

      * [ ] Adicionar `pywebview` ao arquivo `requirements.txt`.
      * [ ] Instalar a nova dependência no ambiente de desenvolvimento (`pip install -r requirements.txt`).

  * [ ] **2. Criação da API de Interação (A Ponte)**

      * [ ] Criar um novo arquivo chamado `app/api.py`.
      * [ ] Dentro de `api.py`, definir uma classe Python (ex: `class Api:`).
      * [ ] Dentro desta classe, criar os métodos "esqueleto" que o JavaScript precisará chamar. Estes métodos, por enquanto, podem apenas imprimir uma mensagem para confirmar que foram chamados.
          * `def open_file_dialog(self):` (para adicionar arquivos avulsos)
          * `def open_folder_dialog(self):` (para selecionar as pastas de origem/destino)
          * `def open_folder_in_explorer(self, folder_path):` (para a ação "Abrir Local")

  * [ ] **3. Reestruturação do Ponto de Entrada (`run.py`)**

      * [ ] Modificar `run.py` para que ele não inicie mais o servidor Flask com `app.run()`. Este será o arquivo que lançará a janela do desktop.
      * [ ] O script `run.py` será responsável por:
          * Importar o `pywebview`, a `app` do Flask e a nova classe `Api`.
          * Instanciar a nossa API: `api = Api()`.
          * Iniciar o servidor Flask em uma *thread* separada (para que ele não bloqueie a janela da interface).
          * Criar a janela principal da aplicação usando `pywebview.create_window()`, passando:
              * O título da janela (ex: "Painel de Transcrição").
              * A URL da nossa aplicação Flask (`app`).
              * O objeto `api` para que ele seja "injetado" no JavaScript e se torne acessível.

  * [ ] **4. Teste e Validação da Arquitetura Híbrida**

      * [ ] Executar o novo `run.py`.
      * [ ] **Verificar:** A aplicação deve abrir em uma janela de desktop nativa, e não mais em uma aba do navegador.
      * [ ] **Verificar:** A interface web deve ser carregada e parecer funcional como antes.
      * [ ] **Verificar (passo crucial):** Abrir as ferramentas de desenvolvedor da janela (`pywebview` permite isso em modo debug) e testar no console se o objeto da API está acessível via JavaScript (ex: digitando `window.pywebview.api`).

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

* [ ] **1. Lógica da API de Interação (`app/api.py`)**
    * [ ] Implementar a lógica real dos métodos na classe `Api` usando bibliotecas Python nativas (como `tkinter.filedialog`, `os`, `subprocess`).
        * `open_folder_dialog()`: Deve abrir um seletor de pastas e retornar o caminho da pasta selecionada.
        * `open_file_dialog()`: Deve abrir um seletor de arquivos (permitindo múltiplos) e retornar uma lista com os caminhos dos arquivos selecionados.
        * `open_folder_in_explorer(path)`: Deve receber um caminho e abrir o explorador de arquivos do sistema nesse local.

* [ ] **2. Conexão do Front-End com a API Híbrida (`app/static/js/main.js`)**
    * [ ] **Seleção de Origem/Destino:**
        * [ ] Adicionar botões "Selecionar Pasta" ao lado dos campos de Origem e Destino no `index.html`.
        * [ ] Em `main.js`, fazer esses botões chamarem `window.pywebview.api.open_folder_dialog()`.
        * [ ] O caminho retornado pela API deve preencher o valor do campo de input correspondente.
    * [cite_start][ ] **Botão "+ Adicionar Arquivo":** [cite: 141, 151, 185]
        * [ ] Conectar o botão para que ele chame `window.pywebview.api.open_file_dialog()`.
        * [ ] Para cada arquivo retornado pela API, criar dinamicamente um novo item na lista "Arquivos para Processar".
    * [ ] **Lógica de Início Modificada:**
        * [ ] Alterar a função do botão "INICIAR TRANSCRIÇÃO". Em vez de o back-end escanear uma pasta, o front-end agora será responsável por coletar todos os caminhos de arquivo da lista "Arquivos para Processar" e enviá-los de uma vez para o back-end.
        * [ ] Modificar a rota `/start-processing` em `routes.py` para receber uma lista explícita de arquivos, em vez de um caminho de pasta para escanear.

* [ ] **3. [cite_start]Implementação do Menu de Contexto (`app/static/js/ui.js` e `main.js`)** [cite: 144, 189]
    * [ ] **Ação "Remover da Fila":** Implementar a lógica em `main.js` para remover o item selecionado da lista da interface (só deve funcionar antes de o processo iniciar).
    * [ ] **Ação "Abrir Local do Arquivo":**
        * [ ] Fazer esta opção chamar `window.pywebview.api.open_folder_in_explorer(path)`.
        * [ ] O `path` a ser aberto deve ser extraído do item da lista (seja da lista de processamento ou da de concluídos).

* [ ] **4. Controles de Processo e Limpeza**
    * [cite_start][ ] **Botão "PARAR PROCESSO":** Conectar o botão para fazer um `fetch` à rota `/stop-processing`, conforme planejado anteriormente. [cite: 143, 188]
    * [cite_start][ ] **Botões "Limpar Fila" e "Limpar Concluídos":** [cite: 142, 187] Implementar a lógica em `main.js` para limpar o conteúdo das listas da interface.

---

### **Fase 7: Documentação e Finalização**

[cite_start]Esta fase final garante que o projeto seja compreensível, fácil de instalar, usar e manter. [cite: 191]

#### **Checklist da Fase 7**

* [ ] **1. Documentação para o Usuário (`README.md`)**
    * [cite_start][ ] Atualizar as "Instruções de Instalação" para incluir `pywebview` e outras possíveis dependências do sistema operacional. [cite: 191]
    * [ ] Reescrever a seção "Como Instalar e Rodar", explicando que agora se executa `run.py` para abrir uma aplicação de desktop.
    * [ ] Detalhar todas as novas funcionalidades interativas: como selecionar pastas, adicionar arquivos avulsos, usar o menu de contexto, etc.
    * [ ] Adicionar screenshots da aplicação final em funcionamento.

* [ ] **2. Documentação Técnica (`docs/`)**
    * [cite_start][ ] **Atualizar `ARQUITETURA.md`:** [cite: 192]
        * Adicionar uma nova seção descrevendo a "Ponte de Interação (API Híbrida)", explicando o papel do `pywebview` e do arquivo `app/api.py`.
        * [cite_start]Revisar as responsabilidades do Front-end e Back-end para refletir a nova arquitetura. [cite: 98]
    * [ ] **Criar `HYBRID_API.md`:**
        * Criar um novo documento para detalhar a API da ponte de interação.
        * Listar cada função em `app/api.py`, seus parâmetros e o que ela retorna para o JavaScript (ex: `open_file_dialog() -> list[str]`).
    * [cite_start][ ] **Atualizar `FLUXO_DE_TRABALHO.md`:** [cite: 192]
        * Revisar os fluxos de trabalho do usuário para incorporar o uso dos novos botões de seleção de arquivos/pastas e as ações do menu de contexto.
    * [cite_start][ ] **Finalizar `DIARIO_DE_DESENVOLVIMENTO.md`:** [cite: 122]
        * Marcar as Fases 5, 6 e 7 como "Concluídas", resumindo as realizações de cada uma.

* [ ] **3. Limpeza e Revisão Final do Código**
    * [cite_start][ ] Remover `console.log` e `print()` de depuração que não são mais necessários. [cite: 193]
    * [cite_start][ ] Adicionar comentários ao código em partes complexas, especialmente em `run.py`, `app/api.py` e na lógica de `main.js` que lida com as chamadas da API híbrida. [cite: 193]
    * [ ] Garantir que o código esteja formatado de forma limpa e consistente.
    * [ ] Verificar se o arquivo `.gitignore` está configurado corretamente para ignorar arquivos de cache do Python (ex: `__pycache__/`).