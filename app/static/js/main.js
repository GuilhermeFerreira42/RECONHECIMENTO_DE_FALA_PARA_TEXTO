// Conteúdo de app/static/js/main.js (Fase 6 - com retentativa contínua)

function waitForPywebviewApi(maxRetries = 20, interval = 500) {
    let attempts = 0;
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            if (window.pywebview && window.pywebview.api) {
                clearInterval(intervalId);
                resolve(window.pywebview.api);
            } else if (attempts >= maxRetries) {
                clearInterval(intervalId);
                reject("API não disponível após timeout.");
            } else {
                attempts++;
            }
        }, interval);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const api = await waitForPywebviewApi();
        console.log("API encontrada com sucesso!", api);
        // --- Elementos da UI ---
        const startButton = document.getElementById('start-btn');
        const stopButton = document.getElementById('stop-btn');
        const selectOrigemBtn = document.getElementById('select-origem-btn');
        const selectDestinoBtn = document.getElementById('select-destino-btn');
        const origemInput = document.getElementById('origem');
        const destinoInput = document.getElementById('destino');
        const addFileBtn = document.getElementById('add-file-btn');
        const clearQueueBtn = document.getElementById('clear-queue-btn');
        const clearCompletedBtn = document.getElementById('clear-completed-btn');
        
        const queueList = document.getElementById('queue-list');
        const completedList = document.getElementById('completed-list');
        const progressBarGeneral = document.getElementById('progress-bar-general');
        const progressTextGeneral = document.getElementById('progress-text-general');

        let progressInterval = null;
        let isProcessing = false;

        // --- Funções de UI ---

        function addFileToQueue(filePath) {
            const fileName = filePath.split('\\').pop().split('/').pop();
            
            // Evita adicionar arquivos duplicados
            if (document.querySelector(`#queue-list li[data-filepath="${filePath}"]`)) {
                console.warn(`Arquivo já na fila: ${filePath}`);
                return;
            }

            const li = document.createElement('li');
            li.className = 'flex flex-col px-5 py-3 border-b border-gray-100';
            li.setAttribute('data-filepath', filePath); // Usa o caminho completo como ID único
            li.setAttribute('data-filename', fileName);

            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <i class="fas fa-video text-gray-500 text-xl"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-gray-900 font-medium truncate" title="${filePath}">${fileName}</p>
                        <p class="text-gray-500 text-sm status-text">Aguardando na fila...</p>
                    </div>
                </div>
                <div class="mt-2 h-1 bg-transparent rounded-full overflow-hidden">
                    <div class="h-1 bg-blue-600 rounded-full individual-progress" style="width: 0%;"></div>
                </div>
            `;
            queueList.appendChild(li);
        }

        function moveItemToCompleted(filePath) {
            const itemToMove = document.querySelector(`#queue-list li[data-filepath="${filePath}"]`);
            if (itemToMove) {
                const fileName = itemToMove.dataset.filename;
                itemToMove.remove();
                
                const completedFilename = fileName.replace(/\.[^/.]+$/, ".txt");
                const li = document.createElement('li');
                li.className = 'flex items-center gap-3 px-5 py-3';
                li.setAttribute('data-filepath', `${destinoInput.value}/${completedFilename}`); // Caminho do arquivo de saída
                li.setAttribute('data-filename', completedFilename);

                li.innerHTML = `
                    <i class="fas fa-file-alt text-green-600 text-xl"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-gray-900 font-medium truncate" title="${li.dataset.filepath}">${completedFilename}</p>
                        <p class="text-gray-500 text-xs">Concluído com sucesso</p>
                    </div>
                `;
                completedList.appendChild(li);
            }
        }
        
        // --- Lógica de Atualização de Progresso (Polling) ---
        
        function updateProgress() {
            fetch('/get-progress')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'idle') return;

                    progressBarGeneral.style.width = `${data.progress_general}%`;
                    const currentFileName = data.current_file.filename || '...';
                    progressTextGeneral.textContent = `Geral: ${data.progress_general}% (${data.files_processed}/${data.total_files}) | Processando: ${currentFileName}`;
                    
                    // Atualizar o item atual em processamento
                    if (data.status === 'running' && data.current_file.full_path) {
                        const currentItem = document.querySelector(`#queue-list li[data-filepath="${data.current_file.full_path}"]`);
                        if (currentItem) {
                            const statusP = currentItem.querySelector('.status-text');
                            const individualProgress = currentItem.querySelector('.individual-progress');
                            
                            // Marca todos os itens anteriores como concluídos
                            let previousSibling = currentItem.previousElementSibling;
                            while(previousSibling) {
                                moveItemToCompleted(previousSibling.dataset.filepath);
                                previousSibling = currentItem.previousElementSibling;
                            }

                            if (typeof data.current_file.progress === 'number') {
                                statusP.textContent = `Transcrevendo... ${data.current_file.progress}%`;
                                statusP.className = 'text-blue-600 text-sm status-text';
                                individualProgress.parentElement.classList.add('bg-gray-200');
                                individualProgress.style.width = `${data.current_file.progress}%`;
                            }
                        }
                    }

                    // Finalizar o processo
                    if (data.status === 'completed') {
                        clearInterval(progressInterval);
                        progressTextGeneral.textContent = `Processo Finalizado! ${data.total_files} arquivos processados.`;
                        isProcessing = false;
                        
                        // Move todos os itens restantes na fila para concluídos
                        const remainingItems = queueList.querySelectorAll('li');
                        remainingItems.forEach(item => moveItemToCompleted(item.dataset.filepath));
                    }
                })
                .catch(error => {
                    console.error("Erro ao buscar progresso:", error);
                    clearInterval(progressInterval);
                    isProcessing = false;
                });
        }

        // --- Event Listeners ---

        selectOrigemBtn.addEventListener('click', async () => {
            const folderPath = await api.open_folder_dialog('Selecione a Pasta de Origem');
            if (folderPath) {
                origemInput.value = folderPath;
                // Futuramente, poderíamos auto-escanear e popular a fila aqui
            }
        });

        selectDestinoBtn.addEventListener('click', async () => {
            const folderPath = await api.open_folder_dialog('Selecione a Pasta de Destino');
            if (folderPath) {
                destinoInput.value = folderPath;
            }
        });

        addFileBtn.addEventListener('click', async () => {
            const files = await api.open_file_dialog();
            if (files && files.length > 0) {
                files.forEach(addFileToQueue);
            }
        });

        clearQueueBtn.addEventListener('click', () => {
            if (!isProcessing) {
                queueList.innerHTML = '';
            } else {
                alert('Não é possível limpar a fila durante o processamento.');
            }
        });

        clearCompletedBtn.addEventListener('click', () => {
            completedList.innerHTML = '';
        });
        
        startButton.addEventListener('click', () => {
            if (isProcessing) {
                alert('Um processo já está em andamento.');
                return;
            }
            
            const fileItems = queueList.querySelectorAll('li');
            if (fileItems.length === 0) {
                alert('Adicione arquivos à fila antes de iniciar.');
                return;
            }

            const destPath = destinoInput.value;
            if (!destPath) {
                alert('Por favor, selecione uma pasta de destino.');
                return;
            }

            const fileList = Array.from(fileItems).map(item => item.dataset.filepath);

            fetch('/start-processing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_list: fileList, dest_path: destPath }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    isProcessing = true;
                    progressInterval = setInterval(updateProgress, 1000);
                } else {
                    alert(`Erro ao iniciar processo: ${data.message}`);
                }
            });
        });

        // A lógica do stopButton será implementada em uma fase futura.
    } catch (error) {
        console.error("ERRO CRÍTICO: API não encontrada.", error);
        alert("Falha ao conectar à API. Reinicie a aplicação.");
    }
});