# Documentação da API

A interface se comunica com o back-end através dos seguintes endpoints RESTful.
---

### Iniciar Processo de Transcrição

-   **Endpoint:** `/start-processing`
-   **Método HTTP:** `POST`
-   **Descrição:** Inicia um novo trabalho de transcrição em uma thread de segundo plano.
-   **Corpo da Requisição (JSON):**
    ```json
    {
      "source_path": "C:\\Caminho\\Para\\Origem",
      "dest_path": "C:\\Caminho\\Para\\Destino"
    }
    ```
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "status": "sucesso",
      "message": "Processo iniciado.",
      "files": [
        "C:\\Caminho\\Para\\Origem\\video1.mp4",
        "C:\\Caminho\\Para\\Origem\\video2.mp4"
      ]
    }
    ```
-   **Respostas de Erro:**
    -   [cite_start]**400 Bad Request:** Se os caminhos não forem fornecidos. [cite: 2]
    -   **500 Internal Server Error:** Se o modelo Vosk não pôde ser carregado.

---

### Obter Progresso Atual

-   **Endpoint:** `/get-progress`
-   **Método HTTP:** `GET`
-   **Descrição:** Retorna o status atual do trabalho de transcrição. O front-end chama este endpoint repetidamente (polling) para atualizar a interface.
-   **Corpo da Requisição:** Nenhum.
-   **Resposta de Sucesso (200 OK):**
    -   Se um trabalho estiver em andamento (**Estrutura de `current_file` atualizada**):
        ```json
        {
          "status": "running",
          "progress_general": 35,
          "total_files": 20,
          "files_processed": 7,
          "current_file": {
            "filename": "aula_08.mp4",
            "progress": 42
          }
        }
        ```
    -   Se nenhum trabalho foi iniciado:
        ```json
        {
          "status": "idle"
        }
        ```
    -   Quando o trabalho é concluído:
         ```json
        {
          "status": "completed",
          "progress_general": 100,
          "total_files": 20,
          "files_processed": 20,
          "current_file": {
            "filename": "Processo finalizado!",
            "progress": 100
          }
        }
        ```