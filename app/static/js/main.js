// Conteúdo FINAL E ROBUSTO - v.3
console.log("main.js (Final e Robusto) foi carregado.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM totalmente carregado.");

    // --- Elementos da UI ---
    const startButton = document.getElementById('start-btn');
    const sourceInput = document.getElementById('origem');
    const destInput = document.getElementById('destino');
    const queueList = document.getElementById('queue-list');
    const completedList = document.getElementById('completed-list');
    const progressBarGeneral = document.getElementById('progress-bar-general');
    const progressTextGeneral = document.getElementById('progress-text-general');

    // --- Variáveis de Estado ---
    let progressInterval = null;
    let lastProcessedFileCount = 0;
    // Fila de espera para mover itens, evitando condição de corrida
    let filesToMoveQueue = []; 

    // --- Funções de Ajuda ---
    function moveCompletedItem(filename) {
        const itemToMove = document.querySelector(`#queue-list li[data-filename="${filename}"]`);
        if (itemToMove) {
            itemToMove.remove();
            const completedFilename = filename.replace(/\.[^/.]+$/, ".txt");
            const li = document.createElement('li');
            li.className = 'flex items-center gap-3 px-5 py-3';
            li.setAttribute('data-filename', completedFilename);
            li.innerHTML = `
                <i class="fas fa-file-alt text-green-600 text-xl"></i>
                <div class="flex-1 min-w-0">
                    <p class="text-gray-900 font-medium truncate">${completedFilename}</p>
                    <p class="text-gray-500 text-xs">Concluído com sucesso</p>
                </div>
            `;
            completedList.appendChild(li);
        }
    }

    // --- Função Principal de Atualização ---
    function updateProgress() {
        // PASSO 1: Mover itens da fila de espera do ciclo anterior (AÇÃO SEGURA)
        while (filesToMoveQueue.length > 0) {
            const filenameToMove = filesToMoveQueue.shift(); // Pega o primeiro da fila
            moveCompletedItem(filenameToMove);
        }

        fetch('/get-progress')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'idle') return;
                console.log("Progresso recebido:", data);

                // PASSO 2: Atualizar a UI com os dados recebidos
                progressBarGeneral.style.width = `${data.progress_general}%`;
                const currentFileName = (data.current_file && data.current_file.filename) ? data.current_file.filename : '...';
                progressTextGeneral.textContent = `Geral: ${data.progress_general}% (${data.files_processed}/${data.total_files}) | Processando: ${currentFileName}`;

                // PASSO 3: Identificar um novo arquivo concluído
                if (data.files_processed > lastProcessedFileCount) {
                    const queueItems = queueList.querySelectorAll('li');
                    // O item concluído é o que está no topo da lista visual
                    const finishedItem = queueItems[0]; 
                    if (finishedItem) {
                        const finishedFilename = finishedItem.dataset.filename;
                        // Apenas marca visualmente e adiciona à fila para mover no próximo ciclo
                        finishedItem.querySelector('.status-text').textContent = 'Concluído';
                        finishedItem.querySelector('.status-text').className = 'text-green-600 text-sm status-text';
                        finishedItem.querySelector('.individual-progress').style.width = '100%';
                        filesToMoveQueue.push(finishedFilename);
                    }
                    lastProcessedFileCount = data.files_processed;
                }
                
                // PASSO 4: Atualizar a barra de progresso do item ATUAL
                if (data.status === 'running' && data.current_file && data.current_file.filename) {
                    const currentItem = document.querySelector(`#queue-list li[data-filename="${data.current_file.filename}"]`);
                    if (currentItem) {
                        const statusP = currentItem.querySelector('.status-text');
                        const individualProgress = currentItem.querySelector('.individual-progress');
                        if (typeof data.current_file.progress === 'number') {
                            statusP.textContent = `Transcrevendo... ${data.current_file.progress}%`;
                            statusP.className = 'text-blue-600 text-sm status-text';
                            individualProgress.parentElement.classList.add('bg-gray-200');
                            individualProgress.style.width = `${data.current_file.progress}%`;
                        }
                    }
                }

                // PASSO 5: Finalizar o processo
                if (data.status === 'completed') {
                    clearInterval(progressInterval);
                    progressTextGeneral.textContent = `Processo Finalizado! ${data.total_files} arquivos processados.`;
                    
                    // Esvazia a fila de mover uma última vez
                     while (filesToMoveQueue.length > 0) {
                        const filenameToMove = filesToMoveQueue.shift();
                        moveCompletedItem(filenameToMove);
                    }
                    
                    console.log("Processo finalizado, polling interrompido.");
                }
            })
            .catch(error => {
                console.error("Erro ao buscar progresso:", error);
                clearInterval(progressInterval);
                // Limpa a fila de movimento em caso de erro também
                filesToMoveQueue = [];
            });
    }

    // --- Lógica do Botão Iniciar ---
    startButton.addEventListener('click', () => {
        // Reseta todo o estado para um novo processo
        queueList.innerHTML = '';
        completedList.innerHTML = '';
        lastProcessedFileCount = 0;
        filesToMoveQueue = []; // Limpa a fila de mover
        progressBarGeneral.style.width = '0%';
        progressTextGeneral.textContent = 'Aguardando início...';
        if(progressInterval) clearInterval(progressInterval);

        const sourcePath = sourceInput.value || "C:\\Users\\Usuario\\Desktop\\TesteApp\\Origem";
        const destPath = destInput.value || "C:\\Users\\Usuario\\Desktop\\TesteApp\\Destino";

        fetch('/start-processing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_path: sourcePath, dest_path: destPath }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                data.files.forEach(filePath => {
                    const fileName = filePath.split('\\').pop().split('/').pop();
                    const li = document.createElement('li');
                    li.className = 'flex flex-col px-5 py-3 border-b border-gray-100';
                    li.setAttribute('data-filename', fileName);
                    li.innerHTML = `
                        <div class="flex items-center gap-3">
                            <i class="fas fa-video text-gray-500 text-xl"></i>
                            <div class="flex-1 min-w-0">
                                <p class="text-gray-900 font-medium truncate">${fileName}</p>
                                <p class="text-gray-500 text-sm status-text">Aguardando na fila...</p>
                            </div>
                        </div>
                        <div class="mt-2 h-1 bg-transparent rounded-full overflow-hidden">
                            <div class="h-1 bg-blue-600 rounded-full individual-progress" style="width: 0%;"></div>
                        </div>
                    `;
                    queueList.appendChild(li);
                });
                progressInterval = setInterval(updateProgress, 1500);
            } else {
                alert(`Erro ao iniciar processo: ${data.message}`);
            }
        });
    });
});