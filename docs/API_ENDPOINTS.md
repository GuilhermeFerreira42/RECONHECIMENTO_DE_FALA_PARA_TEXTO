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
      "message": "Processo iniciado em segundo plano."
    }
    ```
-   **Respostas de Erro:**
    -   **400 Bad Request:** Se os caminhos não forem fornecidos.
        ```json
        {
          "status": "erro",
          "message": "Caminhos de origem ou destino não fornecidos."
        }
        ```
    -   **500 Internal Server Error:** Se o modelo Vosk não pôde ser carregado.
        ```json
        {
          "status": "erro",
          "message": "Modelo Vosk não carregado."
        }
        ```

---

### Obter Progresso Atual

-   **Endpoint:** `/get-progress`
-   **Método HTTP:** `GET`
-   **Descrição:** Retorna o status atual do trabalho de transcrição em andamento. O front-end deve chamar este endpoint repetidamente (polling) para atualizar a interface.
-   **Corpo da Requisição:** Nenhum.
-   **Resposta de Sucesso (200 OK):**
    -   Se um trabalho estiver em andamento:
        ```json
        {
          "status": "running",
          "progress_general": 35,
          "total_files": 20,
          "files_processed": 7,
          "current_file": "aula_08.mp4"
        }
        ```
    -   Se nenhum trabalho foi iniciado:
        ```json
        {
          "status": "idle"
        }
        ```