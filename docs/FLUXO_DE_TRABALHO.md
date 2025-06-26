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