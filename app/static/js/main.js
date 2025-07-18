// ==================================================================
// Arquivo: app/static/js/main.js (Atualizado para Múltiplas Origens)
// Principais mudanças:
// - A fila `fileQueue` agora armazena objetos {path, source} para rastrear a origem.
// - Remoção da dependência do input 'origem'.
// - Novo botão `add-folder-btn` para adicionar pastas à fila.
// - `updateFileTree` renderiza grupos de arquivos baseados em suas pastas de origem.
// - A lógica de `start-processing` envia a fila estruturada para o backend.
// ==================================================================

function waitForPywebviewApi() {
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            if (window.pywebview && window.pywebview.api) {
                clearInterval(intervalId);
                resolve(window.pywebview.api);
            }
        }, 100);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const api = await waitForPywebviewApi();
    
    // --- Elementos da UI ---
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const settingsBtn = document.getElementById('settings-btn');
    
    // REMOVIDO: const origemInput = document.getElementById('origem');
    const destinoInput = document.getElementById('destino');
    // REMOVIDO: const selectOrigemBtn = document.getElementById('select-origem-btn');
    const selectDestinoBtn = document.getElementById('select-destino-btn');
    
    // NOVO: Botão para adicionar pastas
    const addFolderBtn = document.getElementById('add-folder-btn');
    const addFileBtn = document.getElementById('add-file-btn');
    const clearQueueBtn = document.getElementById('clear-queue-btn');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    
    const fileTreeContainer = document.getElementById('file-tree-container');
    const inProgressList = document.getElementById('in-progress-list');
    const completedList = document.getElementById('completed-list');
    
    const progressBarGeneral = document.getElementById('progress-bar-general');
    const progressTextGeneral = document.getElementById('progress-text-general');
    
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalBtn = document.getElementById('close-settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const maxConcurrentInput = document.getElementById('max-concurrent-tasks');

    const dropZone = document.getElementById('drop-zone');
    const dropZoneOverlay = document.getElementById('drop-zone-overlay');
    let progressInterval = null;

    // ATUALIZADO: fileQueue agora é um array de objetos para rastrear a origem.
    // Formato: { path: "C:/...", source: "C:/Origem1" } ou { path: "D:/...", source: null }
    let fileQueue = []; 

    // --- Funções da Árvore de Diretórios ---
    function buildFileTree(filePaths, basePath) {
        const tree = {};
        filePaths.forEach(path => {
            // Usa o basePath para extrair o caminho relativo corretamente
            const relativePath = path.replace(basePath, '').replace(/^[\/\\]/, '');
            const parts = relativePath.split(/[\/\\]/);
            let currentLevel = tree;
            parts.forEach((part, index) => {
                if (index === parts.length - 1) { // É um arquivo
                    currentLevel[part] = { _isLeaf: true, _fullPath: path };
                } else { // É um diretório
                    if (!currentLevel[part]) {
                        currentLevel[part] = { _isLeaf: false };
                    }
                    currentLevel = currentLevel[part];
                }
            });
        });
        return tree;
    }

    function renderTree(node, container, level = 0) {
        const ul = document.createElement('ul');
        if (level > 0) ul.className = 'pl-4';

        Object.keys(node).sort().forEach(key => {
            if (key.startsWith('_')) return;

            const li = document.createElement('li');
            const itemData = node[key];

            if (itemData._isLeaf) {
                // É um arquivo
                li.className = 'file-item text-sm text-gray-700 p-1 rounded-md';
                li.dataset.filepath = itemData._fullPath;
                li.innerHTML = `<i class="fas fa-file-audio text-gray-500 mr-2"></i>${key}`;
            } else {
                // É uma pasta
                li.innerHTML = `<details class="folder-item" open>
                                  <summary class="p-1 cursor-pointer hover:bg-gray-100 rounded-md"><i class="fas fa-folder text-yellow-500 mr-2"></i>${key}</summary>
                                </details>`;
                const details = li.querySelector('details');
                renderTree(itemData, details, level + 1);
            }
            ul.appendChild(li);
        });
        container.appendChild(ul);
    }

    // --- Funções de UI ---
    function updateUIForState(state) {
        const isIdle = state === 'idle';
        const isRunning = state === 'running';
        const isPaused = state === 'paused';
        const isStoppedOrCompleted = state === 'stopped' || state === 'completed';

        startBtn.classList.toggle('hidden', !isIdle && !isStoppedOrCompleted);
        pauseBtn.classList.toggle('hidden', !isRunning);
        resumeBtn.classList.toggle('hidden', !isPaused);
        stopBtn.classList.toggle('hidden', isIdle || isStoppedOrCompleted);
        [destinoInput, selectDestinoBtn, addFolderBtn, addFileBtn, clearQueueBtn, settingsBtn].forEach(el => {
            el.disabled = isRunning || isPaused;
        });
    }

    // --- Inputs editáveis e validação ---
    destinoInput.addEventListener('blur', async () => {
        if (destinoInput.value) {
            const isValid = await api.validate_path(destinoInput.value);
            destinoInput.classList.toggle('border-red-500', !isValid);
        }
    });

    // --- Tema escuro ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.documentElement.classList.toggle('dark', darkModeToggle.checked);
        });
    }

    // ATUALIZADO: Função reescrita para lidar com múltiplas origens
    function updateFileTree() {
        fileTreeContainer.innerHTML = '';
        if (fileQueue.length === 0) {
            fileTreeContainer.innerHTML = '<p class="text-center text-gray-400 p-4">Nenhum arquivo na fila.</p>';
            return;
        }

        // 1. Agrupar arquivos por sua pasta de origem (source)
        const groupedBySource = fileQueue.reduce((acc, file) => {
            const source = file.source || 'avulsos'; // Agrupa arquivos avulsos
            if (!acc[source]) {
                acc[source] = [];
            }
            acc[source].push(file.path);
            return acc;
        }, {});

        // 2. Renderizar cada grupo
        for (const source in groupedBySource) {
            const files = groupedBySource[source];
            const sourceName = source === 'avulsos' ? 'Arquivos Avulsos' : source.split(/[\\/]/).pop();
            
            const groupContainer = document.createElement('div');
            groupContainer.className = 'mb-4';

            const header = document.createElement('h3');
            header.className = 'text-sm font-semibold text-gray-600 p-1 border-b mb-1';
            header.innerHTML = `<i class="fas ${source === 'avulsos' ? 'fa-file-import' : 'fa-folder'} mr-2"></i>${sourceName}`;
            groupContainer.appendChild(header);

            if (source === 'avulsos') {
                 files.forEach(path => {
                    const li = document.createElement('li');
                    li.className = 'file-item text-sm text-gray-700 p-1 rounded-md list-none';
                    li.dataset.filepath = path;
                    li.innerHTML = `<i class="fas fa-file-audio text-gray-500 mr-2"></i>${path.split(/[\\/]/).pop()}`;
                    groupContainer.appendChild(li);
                });
            } else {
                 const tree = buildFileTree(files, source);
                 renderTree(tree, groupContainer);
            }
            fileTreeContainer.appendChild(groupContainer);
        }
    }

    // --- Botões de expandir/recolher árvore ---
    const expandAllBtn = document.getElementById('expand-all-btn');
    const collapseAllBtn = document.getElementById('collapse-all-btn');

    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', () => {
            fileTreeContainer.querySelectorAll('details.folder-item').forEach(d => d.open = true);
        });
    }
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', () => {
            fileTreeContainer.querySelectorAll('details.folder-item').forEach(d => d.open = false);
        });
    }

    // --- Seleção sincronizada entre blocos ---
    function clearAllSelections() {
        document.querySelectorAll('.selected-item').forEach(el => el.classList.remove('selected-item'));
    }
    function selectItemInAllPanels(filepath) {
        clearAllSelections();
        document.querySelectorAll(`[data-filepath="${filepath}"]`).forEach(el => el.classList.add('selected-item'));
    }
    fileTreeContainer.addEventListener('click', e => {
        const li = e.target.closest('li[data-filepath]');
        if (li) selectItemInAllPanels(li.dataset.filepath);
    });
    inProgressList.addEventListener('click', e => {
        const li = e.target.closest('li[data-filepath]');
        if (li) selectItemInAllPanels(li.dataset.filepath);
    });

    // --- Remoção e movimentação sincronizada via eventos do menu de contexto ---
    document.addEventListener('queue:action', e => {
        const { action, filePath } = e.detail;
        if (action === 'remove') {
            // Remove da fila
            fileQueue = fileQueue.filter(item => item.path !== filePath);
            // Remove da UI
            document.querySelectorAll(`[data-filepath="${filePath}"]`).forEach(el => el.remove());
            updateFileTree();
        } else if (action === 'move-top') {
            const idx = fileQueue.findIndex(item => item.path === filePath);
            if (idx > 0) {
                const [item] = fileQueue.splice(idx, 1);
                fileQueue.unshift(item);
                updateFileTree();
            }
        }
    });

    // --- Spinner em pastas com arquivos em processamento ---
    function updateFolderSpinners(filesInProgress) {
        // Remove todos os spinners antigos
        fileTreeContainer.querySelectorAll('.folder-item summary .fa-cog').forEach(el => el.remove());
        // Para cada pasta, verifica se contém algum arquivo em progresso
        fileTreeContainer.querySelectorAll('details.folder-item').forEach(details => {
            const summary = details.querySelector('summary');
            const folderPath = summary.textContent.trim();
            // Caminhos dos arquivos em progresso
            const files = Object.keys(filesInProgress);
            let hasActive = false;
            files.forEach(fp => {
                if (summary && fp.includes(folderPath)) hasActive = true;
            });
            if (hasActive) {
                const spinner = document.createElement('i');
                spinner.className = 'fas fa-cog fa-spin text-blue-500 ml-2';
                summary.appendChild(spinner);
            }
        });
    }

    // --- Atualização do updateProgress para feedback visual dinâmico ---
    function updateProgress() {
        fetch('/get-progress')
            .then(response => response.json())
            .then(data => {
                updateUIForState(data.status);
                progressBarGeneral.style.width = `${data.progress_general}%`;
                progressTextGeneral.textContent = `Geral: ${Math.round(data.progress_general)}% (${data.files_processed}/${data.total_files}) | Decorrido: ${data.batch_elapsed_str}`;
                
                // NOVO: Lógica para exibir toda a fila em "Em progresso"
                if (data.status === 'running' || data.status === 'paused') {
                    if (inProgressList.innerHTML === '') { // Renderiza a lista apenas uma vez no início
                        fileQueue.forEach(file => {
                            const li = document.createElement('li');
                            li.className = 'flex flex-col px-4 py-3 border-b border-gray-100';
                            li.dataset.filepath = file.path;
                            li.innerHTML = `
                                <div class="flex items-center gap-3">
                                    <span class="status-icon"><i class="fas fa-clock text-gray-400"></i></span>
                                    <p class="flex-1 font-medium truncate" title="${file.path}">${file.path.split(/[\\/]/).pop()}</p>
                                    <span class="progress-percent ml-2 text-xs text-gray-500">0%</span>
                                </div>
                                <div class="h-1 mt-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div class="progress-bar h-1 bg-blue-600 rounded-full" style="width: 0%;"></div>
                                </div>
                            `;
                            inProgressList.appendChild(li);
                        });
                    }

                    // Atualiza os itens individuais
                    Object.entries(data.files_in_progress).forEach(([path, info]) => {
                        const li = inProgressList.querySelector(`li[data-filepath="${path}"]`);
                        if (li) {
                            const iconSpan = li.querySelector('.status-icon');
                            const percentSpan = li.querySelector('.progress-percent');
                            const progressBar = li.querySelector('.progress-bar');

                            let statusIcon = '<i class="fas fa-cog fa-spin text-blue-500"></i>';
                            if (info.status === 'paused') {
                                statusIcon = '<i class="fas fa-pause-circle text-yellow-500"></i>';
                            }
                            iconSpan.innerHTML = statusIcon;
                            percentSpan.textContent = `${Math.round(info.progress || 0)}%`;
                            progressBar.style.width = `${info.progress || 0}%`;
                        }
                    });
                    // Atualiza spinners nas pastas
                    updateFolderSpinners(data.files_in_progress);
                }


                data.completed_files.forEach(fileInfo => {
                    const sourcePath = fileInfo.source_path.replace(/\\/g, '/');
                    const treeNode = fileTreeContainer.querySelector(`li[data-filepath="${sourcePath}"]`);
                    if (treeNode) treeNode.innerHTML += ' <i class="fas fa-check-circle text-green-600 ml-1"></i>';
                    
                    // Remove da lista "Em Progresso"
                    const inProgressNode = inProgressList.querySelector(`li[data-filepath="${sourcePath}"]`);
                    if (inProgressNode) inProgressNode.remove();

                    const completedFilename = fileInfo.output_path.split(/[\\/]/).pop();
                    const li = document.createElement('li');
                    li.className = 'group relative flex items-center gap-3 px-4 py-3 hover:bg-gray-100';
                    li.dataset.filepath = fileInfo.output_path;
                    li.innerHTML = `
                        <i class="fas fa-check-circle text-green-600"></i>
                        <p class="flex-1 font-medium truncate" title="${fileInfo.output_path}">${completedFilename}</p>
                        <div class="three-dots-menu absolute top-0 right-0 h-full flex items-center px-4 opacity-0 group-hover:opacity-100 cursor-pointer">
                            <i class="fas fa-ellipsis-v text-gray-500"></i>
                        </div>
                    `;
                    completedList.prepend(li);
                });

                if (data.status === 'completed' || data.status === 'stopped') {
                    clearInterval(progressInterval);
                    progressInterval = null;
                    if (data.status === 'completed') {
                        progressTextGeneral.textContent = `Processo Finalizado! ${data.total_files} arquivos processados.`;
                        inProgressList.innerHTML = '<p class="text-center text-gray-400 p-4">Fila concluída.</p>';
                    } else {
                        progressTextGeneral.textContent = `Processo interrompido. ${data.files_processed}/${data.total_files} concluídos.`;
                    }
                }
            });
    }

    // --- Event Listeners ---
    // NOVO: Event listener para adicionar pastas
    addFolderBtn.addEventListener('click', async () => {
        const folderPath = await api.open_folder_dialog('Selecione a Pasta de Origem');
        if (folderPath) {
            const files = await api.scan_folder_recursively(folderPath);
            // Adiciona cada arquivo com sua pasta de origem
            files.forEach(file => {
                // Evita duplicatas
                if (!fileQueue.some(item => item.path === file)) {
                    fileQueue.push({ path: file.replace(/\\/g, '/'), source: folderPath.replace(/\\/g, '/') });
                }
            });
            updateFileTree();
        }
    });
    
    selectDestinoBtn.addEventListener('click', async () => {
        const folderPath = await api.open_folder_dialog('Selecione a Pasta de Destino');
        if (folderPath) destinoInput.value = folderPath;
    });

    addFileBtn.addEventListener('click', async () => {
        const files = await api.open_file_dialog();
        if (files && files.length > 0) {
            files.forEach(file => {
                const normalizedPath = file.replace(/\\/g, '/');
                // Adiciona como arquivo avulso (source: null)
                if (!fileQueue.some(item => item.path === normalizedPath)) {
                    fileQueue.push({ path: normalizedPath, source: null });
                }
            });
            updateFileTree();
        }
    });

    clearQueueBtn.addEventListener('click', () => {
        if (progressInterval) return;
        fileQueue = [];
        updateFileTree();
    });

    clearCompletedBtn.addEventListener('click', () => {
        completedList.innerHTML = '';
    });

    startBtn.addEventListener('click', () => {
        if (fileQueue.length === 0 || !destinoInput.value) {
            alert('Adicione arquivos/pastas à fila e selecione uma pasta de destino.');
            return;
        }
        
        // ATUALIZADO: O corpo da requisição agora envia a fila estruturada.
        const requestBody = {
            file_list: fileQueue, // Envia o array de objetos
            dest_path: destinoInput.value,
            keep_structure: document.getElementById('keep-structure-checkbox').checked,
            model_name: document.getElementById('model-selector').value
        };

        fetch('/start-processing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'sucesso') {
                completedList.innerHTML = ''; // Limpa concluídos antigos
                inProgressList.innerHTML = ''; // Limpa a lista para ser recriada pelo updateProgress
                progressInterval = setInterval(updateProgress, 1000);
            } else {
                alert(`Erro: ${data.message}`);
            }
        });
    });

    stopBtn.addEventListener('click', () => fetch('/stop-processing', { method: 'POST' }));
    pauseBtn.addEventListener('click', () => fetch('/pause-processing', { method: 'POST' }));

    // ATUALIZADO: Adicionado feedback visual imediato ao retomar
    resumeBtn.addEventListener('click', () => {
        // 1. Atualiza a UI imediatamente para dar feedback ao usuário
        updateUIForState('running'); // Troca os botões de controle principais
        
        // 2. Altera o ícone de todos os arquivos pausados para "processando"
        inProgressList.querySelectorAll('i.fa-pause-circle').forEach(icon => {
            const statusSpan = icon.parentElement;
            statusSpan.innerHTML = '<i class="fas fa-cog fa-spin text-blue-500"></i>';
        });

        // 3. Envia a requisição para o backend confirmar a ação
        fetch('/resume-processing', { method: 'POST' });
    });
    
    // --- Lógica do Modal de Configurações ---
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    saveSettingsBtn.addEventListener('click', () => {
        const settings = {
            max_concurrent_tasks: parseInt(maxConcurrentInput.value, 10)
        };
        fetch('/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        settingsModal.classList.add('hidden');
    });

    // --- Lógica de Drag and Drop (Atualizada) ---
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneOverlay.classList.add('hidden');
        if (progressInterval) return;
        
        // Simula o comportamento chamando a nossa API
        const folderPath = await api.open_folder_dialog('Selecione a pasta que você arrastou');
        if (folderPath) {
             const files = await api.scan_folder_recursively(folderPath);
             files.forEach(file => {
                if (!fileQueue.some(item => item.path === file)) {
                    fileQueue.push({ path: file.replace(/\\/g, '/'), source: folderPath.replace(/\\/g, '/') });
                }
            });
            updateFileTree();
        }
    });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZoneOverlay.classList.remove('hidden'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); dropZoneOverlay.classList.add('hidden'); });

    // --- Inicialização ---
    fetch('/get-settings').then(res => res.json()).then(data => {
        maxConcurrentInput.value = data.max_concurrent_tasks || 1;
    });
    updateFileTree();
    updateUIForState('idle');
});