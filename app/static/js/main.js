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
            const normalizedPath = filePath.replace(/\\/g, '/');
            const fileName = normalizedPath.split('/').pop();
            
            if (document.querySelector(`#queue-list li[data-filepath="${normalizedPath}"]`)) {
                console.warn(`Arquivo já na fila: ${normalizedPath}`);
                return;
            }

            const li = document.createElement('li');
            li.className = 'group relative flex flex-col px-5 py-3 border-b border-gray-100 hover:bg-gray-100 transition-colors';
            li.setAttribute('data-filepath', normalizedPath);
            li.setAttribute('data-filename', fileName);
            
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <i class="fas fa-video text-gray-500 text-xl"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-gray-900 font-medium truncate" title="${normalizedPath}">${fileName}</p>
                        <p class="text-gray-500 text-sm status-text">Aguardando na fila...</p>
                    </div>
                    <div class="three-dots-menu absolute top-0 right-0 h-full flex items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <i class="fas fa-ellipsis-v text-gray-500"></i>
                    </div>
                </div>
                <div class="mt-2 h-1 bg-transparent rounded-full overflow-hidden">
                    <div class="h-1 bg-blue-600 rounded-full individual-progress" style="width: 0%;"></div>
                </div>
            `;
            queueList.appendChild(li);
        }

        function moveItemToCompleted(filePath) {
            const normalizedPath = filePath.replace(/\\/g, '/');
            const itemToMove = document.querySelector(`#queue-list li[data-filepath="${normalizedPath}"]`);
            
            if (itemToMove) {
                const fileName = itemToMove.dataset.filename;
                itemToMove.remove();
                
                const completedFilename = fileName.replace(/\.[^/.]+$/, ".txt");
                const li = document.createElement('li');
                li.className = 'group relative flex items-center gap-3 px-5 py-3 hover:bg-gray-100 transition-colors';
                const destinationPath = (destinoInput.value.replace(/\\/g, '/') + '/' + completedFilename);
                li.setAttribute('data-filepath', destinationPath);
                li.setAttribute('data-filename', completedFilename);
                
                li.innerHTML = `
                    <i class="fas fa-file-alt text-green-600 text-xl"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-gray-900 font-medium truncate" title="${destinationPath}">${completedFilename}</p>
                        <p class="text-gray-500 text-xs">Concluído com sucesso</p>
                    </div>
                    <div class="three-dots-menu absolute top-0 right-0 h-full flex items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <i class="fas fa-ellipsis-v text-gray-500"></i>
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
                    
                    if (data.status === 'running' && data.current_file.full_path) {
                        const normalizedPath = data.current_file.full_path.replace(/\\/g, '/');
                        const currentItem = document.querySelector(`#queue-list li[data-filepath="${normalizedPath}"]`);
                        
                        if (currentItem) {
                            const statusP = currentItem.querySelector('.status-text');
                            const individualProgress = currentItem.querySelector('.individual-progress');
                            
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

                    if (data.status === 'completed' || data.status === 'stopped') {
                        clearInterval(progressInterval);
                        isProcessing = false;
                        
                        if(data.status === 'completed') {
                            progressTextGeneral.textContent = `Processo Finalizado! ${data.total_files} arquivos processados.`;
                            const remainingItems = queueList.querySelectorAll('li');
                            remainingItems.forEach(item => moveItemToCompleted(item.dataset.filepath));
                        } else { 
                            progressTextGeneral.textContent = `Processo interrompido pelo usuário. ${data.files_processed} de ${data.total_files} arquivos foram concluídos.`;
                        }
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
                if (!isProcessing) {
                    queueList.innerHTML = '';
                }
                console.log(`Pasta de origem selecionada. Escaneando ${folderPath}...`);
                try {
                    const files = await api.scan_folder_recursively(folderPath);
                    if (files && files.length > 0) {
                        console.log(`Adicionando ${files.length} arquivos à fila.`);
                        files.forEach(addFileToQueue);
                    } else {
                        alert("Nenhum arquivo de mídia compatível foi encontrado na pasta selecionada.");
                    }
                } catch (error) {
                    console.error("Erro ao escanear a pasta de origem:", error);
                    alert("Ocorreu um erro ao tentar escanear a pasta. Verifique o console para mais detalhes.");
                }
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

            const keepStructure = document.getElementById('keep-structure-checkbox').checked;
            const sourcePath = origemInput.value;

            if (keepStructure && !sourcePath) {
                alert('Para manter a estrutura de pastas, você deve primeiro selecionar uma Pasta de Origem.');
                return;
            }

            const fileList = Array.from(fileItems).map(item => item.dataset.filepath);

            const requestBody = {
                file_list: fileList,
                dest_path: destPath,
                keep_structure: keepStructure,
                source_path: sourcePath 
            };

            fetch('/start-processing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
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

        stopButton.addEventListener('click', () => {
            if (!isProcessing) {
                alert('Nenhum processo em andamento para parar.');
                return;
            }

            console.log("Enviando sinal de parada para o servidor...");
            fetch('/stop-processing', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'sucesso') {
                        console.log("Servidor confirmou o recebimento do sinal de parada.");
                        progressTextGeneral.textContent = "Parando o processo... Aguarde.";
                    } else {
                        alert(`Erro ao tentar parar o processo: ${data.message}`);
                    }
                })
                .catch(error => {
                    console.error("Erro na requisição para parar:", error);
                    alert("Falha de comunicação ao tentar parar o processo.");
                });
        });

    } catch (error) {
        console.error("ERRO CRÍTICO: API não encontrada.", error);
        alert("Falha ao conectar à API. Reinicie a aplicação.");
    }
});