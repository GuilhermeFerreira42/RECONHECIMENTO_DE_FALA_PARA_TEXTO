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

#### **Fase 5: Funcionalidades Finais e Interatividade (A Fazer)**
- **Objetivo:** Implementar os controles de gerenciamento restantes para finalizar a ferramenta.
- [ ] **Botão "+ Adicionar Arquivo":** Implementar a funcionalidade para selecionar arquivos individuais e adicioná-los à fila de processamento.
- [ ] **Lógica de Arquivos Individuais:** Ajustar o `TranscriptionManager` para lidar com arquivos avulsos, salvando suas transcrições na raiz da pasta de destino.
- [ ] **Botões "Limpar":** Implementar a funcionalidade dos botões "Limpar Fila" e "Limpar Concluídos".
- [ ] **Botão "Parar Processo":** Implementar a lógica de parada graciosa do processo no back-end e conectá-la ao botão na interface.
- [ ] **Menu de Contexto:** Implementar as ações do menu de contexto, principalmente "Abrir Local do Arquivo", criando uma rota no back-end para interagir com o sistema de arquivos do usuário.

#### **Fase 6: Documentação e Finalização (A Fazer)**
- **Objetivo:** Criar a documentação final para garantir que o projeto seja compreensível e fácil de manter.
- [ ] Criar um arquivo `README.md` completo com instruções de instalação e uso.
- [ ] Criar a pasta `docs/` com a documentação detalhada (Arquitetura, Fluxos de Trabalho, API, etc.).
- [ ] Revisar o código, adicionar comentários onde for necessário e remover logs de depuração.