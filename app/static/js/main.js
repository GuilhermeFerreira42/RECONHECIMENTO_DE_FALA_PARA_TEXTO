// ==================================================================
// Arquivo: app/static/js/main.js (Atualizado)
// Principais mudanças:
// - Lógica para o modal de configurações.
// - Lógica para os botões de Pausa/Retomada.
// - Lógica para Drag and Drop de pastas.
// - `updateProgress` reescrito para lidar com o novo estado do backend (múltiplos arquivos em progresso).
// - Funções para construir e renderizar a árvore de diretórios.
// - Gerenciamento da nova interface de 3 colunas.
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
    
    const origemInput = document.getElementById('origem');
    const destinoInput = document.getElementById('destino');
    const selectOrigemBtn = document.getElementById('select-origem-btn');
    const selectDestinoBtn = document.getElementById('select-destino-btn');
    
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
    let fileQueue = new Set(); // Usar Set para evitar duplicatas

    // --- Funções da Árvore de Diretórios ---
    function buildFileTree(filePaths, basePath) {
        const tree = {};
        filePaths.forEach(path => {
            const relativePath = path.replace(basePath, '').replace(/^\//, '');
            const parts = relativePath.split('/');
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
                li.style.color = 'black'; // Cor inicial
            } else {
                // É uma pasta
                li.innerHTML = `<details class="folder-item">
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

        [origemInput, destinoInput, selectOrigemBtn, selectDestinoBtn, addFileBtn, clearQueueBtn, settingsBtn].forEach(el => {
            el.disabled = isRunning || isPaused;
        });
    }

    // --- Inputs editáveis e validação ---
    origemInput.addEventListener('blur', async () => {
        if (origemInput.value) {
            const isValid = await api.validate_path(origemInput.value);
            origemInput.classList.toggle('border-red-500', !isValid);
        }
    });
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
            document.body.classList.toggle('dark', darkModeToggle.checked);
        });
    }

    // --- Corrigir exibição de arquivo único vs árvore ---
    function updateFileTree() {
        fileTreeContainer.innerHTML = '';
        if (fileQueue.size === 0) {
            fileTreeContainer.innerHTML = '<p class="text-center text-gray-400 p-4">Nenhum arquivo na fila.</p>';
            return;
        }
        const basePath = origemInput.value || '';
        if (fileQueue.size === 1) {
            // Exibe só o nome do arquivo
            const file = Array.from(fileQueue)[0];
            const fileName = file.split(/[\\/]/).pop();
            const li = document.createElement('li');
            li.className = 'file-item text-sm text-gray-700 p-1 rounded-md';
            li.dataset.filepath = file;
            li.innerHTML = `<i class="fas fa-file-audio text-gray-500 mr-2"></i>${fileName}`;
            fileTreeContainer.appendChild(li);
        } else {
            // Exibe árvore
            const tree = buildFileTree(Array.from(fileQueue), basePath);
            renderTree(tree, fileTreeContainer);
        }
    }

    // --- Adicionar spinner em pastas da Coluna Fonte ---
    function updateFolderSpinners(filesInProgress) {
        // Remove todos os spinners antigos
        fileTreeContainer.querySelectorAll('.folder-item summary .fa-cog').forEach(el => el.remove());
        // Para cada pasta, verifica se contém algum arquivo em progresso
        fileTreeContainer.querySelectorAll('details.folder-item').forEach(details => {
            const summary = details.querySelector('summary');
            const folderPath = summary.dataset && summary.dataset.folderpath;
            // Caminhos dos arquivos em progresso
            const files = Object.keys(filesInProgress);
            let hasActive = false;
            // Verifica se algum arquivo em progresso está dentro desta pasta
            files.forEach(fp => {
                if (folderPath && fp.startsWith(folderPath)) hasActive = true;
            });
            if (hasActive) {
                const spinner = document.createElement('i');
                spinner.className = 'fas fa-cog fa-spin text-blue-500 ml-2';
                summary.appendChild(spinner);
            }
        });
    }

    // --- Exibir porcentagem de progresso na Fila Ativa ---
    function updateProgress() {
        fetch('/get-progress')
            .then(response => response.json())
            .then(data => {
                updateUIForState(data.status);
                progressBarGeneral.style.width = `${data.progress_general}%`;
                progressTextGeneral.textContent = `Geral: ${Math.round(data.progress_general)}% (${data.files_processed}/${data.total_files}) | Decorrido: ${data.batch_elapsed_str}`;
                inProgressList.innerHTML = '';
                updateFolderSpinners(data.files_in_progress);
                Object.entries(data.files_in_progress).forEach(([path, info]) => {
                    const li = document.createElement('li');
                    li.className = 'flex flex-col px-4 py-3 border-b border-gray-100';
                    li.dataset.filepath = path;
                    let statusIcon = '<i class="fas fa-cog fa-spin text-blue-500"></i>';
                    if (info.status === 'paused') {
                        statusIcon = '<i class="fas fa-pause-circle text-yellow-500"></i>';
                    }
                    li.innerHTML = `
                        <div class="flex items-center gap-3">
                            ${statusIcon}
                            <p class="flex-1 font-medium truncate" title="${path}">${info.filename}</p>
                            <span class="ml-2 text-xs text-gray-500">${Math.round(info.progress || 0)}%</span>
                        </div>
                        <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span><i class='fas fa-clock mr-1'></i> ${info.elapsed_str || '--:--'}</span>
                            <span><i class='fas fa-hourglass-half ml-2 mr-1'></i> ETA: ${info.eta_str || '--:--'}</span>
                        </div>
                        <div class="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-1 bg-blue-600 rounded-full" style="width: ${info.progress || 0}%;"></div>
                        </div>
                    `;
                    inProgressList.appendChild(li);
                    const treeNode = fileTreeContainer.querySelector(`li[data-filepath="${path}"]`);
                    if (treeNode) treeNode.style.color = info.status === 'paused' ? 'orange' : 'blue';
                });
                data.completed_files.forEach(fileInfo => {
                    const sourcePath = fileInfo.source_path.replace(/\\/g, '/');
                    const treeNode = fileTreeContainer.querySelector(`li[data-filepath="${sourcePath}"]`);
                    if (treeNode) treeNode.innerHTML += ' <i class="fas fa-check-circle text-green-600 ml-1"></i>';
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
                    inProgressList.innerHTML = '';
                    if (data.status === 'completed') {
                        progressTextGeneral.textContent = `Processo Finalizado! ${data.total_files} arquivos processados.`;
                    } else {
                        progressTextGeneral.textContent = `Processo interrompido. ${data.files_processed}/${data.total_files} concluídos.`;
                    }
                }
            });
    }

    // --- Event Listeners ---
    selectOrigemBtn.addEventListener('click', async () => {
        const folderPath = await api.open_folder_dialog('Selecione a Pasta de Origem');
        if (folderPath) {
            origemInput.value = folderPath;
            const files = await api.scan_folder_recursively(folderPath);
            fileQueue = new Set(files);
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
            files.forEach(file => fileQueue.add(file.replace(/\\/g, '/')));
            updateFileTree();
        }
    });

    clearQueueBtn.addEventListener('click', () => {
        if (progressInterval) return;
        fileQueue.clear();
        updateFileTree();
    });

    clearCompletedBtn.addEventListener('click', () => {
        completedList.innerHTML = '';
    });

    startBtn.addEventListener('click', () => {
        if (fileQueue.size === 0 || !destinoInput.value) {
            alert('Selecione arquivos/pasta de origem e uma pasta de destino.');
            return;
        }
        if (document.getElementById('keep-structure-checkbox').checked && !origemInput.value) {
            alert('Selecione uma pasta de origem para manter a estrutura.');
            return;
        }

        const requestBody = {
            file_list: Array.from(fileQueue),
            dest_path: destinoInput.value,
            keep_structure: document.getElementById('keep-structure-checkbox').checked,
            source_path: origemInput.value,
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
                progressInterval = setInterval(updateProgress, 1000);
            } else {
                alert(`Erro: ${data.message}`);
            }
        });
    });

    stopBtn.addEventListener('click', () => fetch('/stop-processing', { method: 'POST' }));
    pauseBtn.addEventListener('click', () => fetch('/pause-processing', { method: 'POST' }));
    resumeBtn.addEventListener('click', () => fetch('/resume-processing', { method: 'POST' }));

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

    // --- Lógica de Drag and Drop ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneOverlay.classList.remove('hidden');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneOverlay.classList.add('hidden');
    });
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneOverlay.classList.add('hidden');
        if (progressInterval) return;

        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
            // pywebview não expõe o path diretamente, então usamos a API
            // Esta é uma limitação. A melhor abordagem é o usuário arrastar
            // para a janela e a gente abrir o diálogo de seleção.
            // Para uma implementação real, o backend precisaria de mais poder.
            // Por agora, vamos simular o comportamento chamando a nossa API.
            const folderPath = await api.open_folder_dialog('Selecione a pasta que você arrastou');
            if (folderPath) {
                origemInput.value = folderPath;
                const files = await api.scan_folder_recursively(folderPath);
                fileQueue = new Set(files);
                updateFileTree();
            }
        }
    });

    // --- Inicialização ---
    fetch('/get-settings').then(res => res.json()).then(data => {
        maxConcurrentInput.value = data.max_concurrent_tasks || 1;
    });
    updateFileTree();
    updateUIForState('idle');
});