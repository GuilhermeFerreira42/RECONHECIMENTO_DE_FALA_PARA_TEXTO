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

### **Fase 5: Funcionalidades Finais (A Fazer)**

-   **Objetivo:** Implementar os controles de gerenciamento e conveniência restantes.
-   **Próximos Passos:**
    -   Fazer o botão `+ Adicionar Arquivo` funcionar.
    -   Fazer os botões `Limpar Fila` e `Limpar Concluídos` funcionarem.
    -   Implementar a funcionalidade do botão `PARAR PROCESSO`.
    -   Implementar as ações do menu de contexto, como "Remover da Fila" ou "Abrir Local".