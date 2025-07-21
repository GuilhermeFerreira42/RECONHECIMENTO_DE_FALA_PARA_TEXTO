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

    let allCompletedOrSkippedPaths = new Set(); // <-- ADICIONAR ESTA LINHA

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
            groupContainer.dataset.sourcePath = source; // Adiciona o atributo para identificar a pasta

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
        document.querySelectorAll(`[data-filepath="${filepath}"]`).forEach(el => {
            el.classList.add('selected-item');
            // **MODIFICADO**: Scroll automático para o item selecionado.
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
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

    // Substitua a função updateFolderSpinners inteira pela versão abaixo.
    function updateFolderSpinners(filesInProgress) {
        // 1. Limpa todos os spinners anteriores para começar do zero a cada atualização.
        //    Usamos uma classe dedicada para facilitar a seleção e remoção.
        fileTreeContainer.querySelectorAll('.folder-spinner').forEach(spinner => spinner.remove());

        // 2. Obtém a lista de arquivos que estão atualmente em progresso.
        const inProgressPaths = new Set(Object.keys(filesInProgress));

        // 3. Itera sobre cada arquivo que está sendo processado.
        inProgressPaths.forEach(path => {
            // Encontra o elemento do arquivo (<li>) na árvore de processamento.
            const fileElement = fileTreeContainer.querySelector(`li.file-item[data-filepath="${path}"]`);

            if (fileElement) {
                // 4. Começa a "subir" na árvore do DOM a partir do elemento do arquivo.
                let parentElement = fileElement.parentElement;

                while (parentElement && parentElement !== fileTreeContainer) {
                    // 5. Se o elemento pai for um <details> (que representa uma pasta)...
                    if (parentElement.tagName === 'DETAILS' && parentElement.classList.contains('folder-item')) {
                        const summary = parentElement.querySelector('summary');
                        
                        // 6. ...e se essa pasta ainda não tiver um spinner, adiciona um.
                        if (summary && !summary.querySelector('.folder-spinner')) {
                            const spinner = document.createElement('i');
                            spinner.className = 'fas fa-cog fa-spin text-blue-500 ml-2 folder-spinner';
                            summary.appendChild(spinner);
                        }
                    }
                    // Continua subindo para o próximo pai.
                    parentElement = parentElement.parentElement;
                }
            }
        });
    }

    // Função para aplicar status visual consistente
    function updateStatusStyles(filesInProgress, completedOrSkippedPaths) {
        // Limpa todos os status antigos de todos os elementos relevantes
        document.querySelectorAll('.status-processing, .status-paused, .status-completed').forEach(el => {
            el.classList.remove('status-processing', 'status-paused', 'status-completed');
        });
        // Limpa status de pastas
        fileTreeContainer.querySelectorAll('.folder-status-processing, .folder-status-completed').forEach(el => {
            el.classList.remove('folder-status-processing', 'folder-status-completed');
        });
        // Limpa ícones de concluído para evitar duplicatas
        fileTreeContainer.querySelectorAll('.fa-check-circle').forEach(icon => icon.remove());

        // Aplica status de "processando" e "pausado" em TODOS os painéis
        Object.entries(filesInProgress).forEach(([path, info]) => {
            // Seleciona o arquivo em qualquer lugar da UI (Bloco 1 e Bloco 2)
            const fileEls = document.querySelectorAll(`[data-filepath="${path}"]`);
            fileEls.forEach(el => {
                if (info.status === 'paused') {
                    el.classList.add('status-paused');
                } else if (info.status === 'running') {
                    el.classList.add('status-processing');
                }
            });
        });
        // Aplica status de "concluído" na fila (Bloco 1)
        completedOrSkippedPaths.forEach(path => {
            const fileEls = fileTreeContainer.querySelectorAll(`[data-filepath="${path}"]`);
            fileEls.forEach(el => {
                el.classList.add('status-completed');
                if (!el.querySelector('.fa-check-circle')) {
                    const checkmark = document.createElement('i');
                    checkmark.className = 'fas fa-check-circle text-green-600 ml-1';
                    el.appendChild(checkmark);
                }
            });
        });
        // lógica para status de pastas (já corrigida anteriormente)
        fileTreeContainer.querySelectorAll('div[data-source-path]').forEach(groupContainer => {
            const sourcePath = groupContainer.dataset.sourcePath;
            if (sourcePath === 'avulsos') return;
            const filesInGroup = fileQueue.filter(f => f.source === sourcePath).map(f => f.path);
            if (filesInGroup.length === 0) return;
            const inProgressPaths = Object.keys(filesInProgress);
            const completedPaths = completedOrSkippedPaths.map(f => f.replace(/\\/g, '/'));
            const isAnyPaused = filesInGroup.some(fp => filesInProgress[fp] && filesInProgress[fp].status === 'paused');
            const isAnyInProgress = filesInGroup.some(fp => inProgressPaths.includes(fp) && filesInProgress[fp].status === 'running');
            const areAllCompleted = filesInGroup.every(fp => completedPaths.includes(fp));
            if (areAllCompleted) {
                groupContainer.classList.add('folder-status-completed');
            } else if (isAnyPaused) {
                groupContainer.classList.add('folder-status-processing'); // Pausado também é considerado "em andamento" para pasta
            } else if (isAnyInProgress) {
                groupContainer.classList.add('folder-status-processing');
            }
        });
    }

    // SUBSTITUIR a função updateProgress por esta versão melhorada:
    function updateProgress() {
        fetch('/get-progress')
            .then(response => response.json())
            .then(data => {
                updateUIForState(data.status);
                progressBarGeneral.style.width = `${data.progress_general}%`;
                progressTextGeneral.textContent = `Geral: ${Math.round(data.progress_general)}% (${data.files_processed}/${data.total_files}) | Decorrido: ${data.batch_elapsed_str}`;

                // Adiciona arquivos recém-concluídos ao nosso conjunto de estado persistente
                data.completed_files.forEach(fileInfo => {
                    allCompletedOrSkippedPaths.add(fileInfo.source_path.replace(/\\/g, '/'));
                });

                // --- GERENCIAMENTO DINÂMICO DA LISTA "EM PROGRESSO" ---
                const inProgressPaths = new Set(Object.keys(data.files_in_progress));
                const uiInProgressItems = new Map();
                inProgressList.querySelectorAll('li[data-filepath]').forEach(li => {
                    uiInProgressItems.set(li.dataset.filepath, li);
                });

                // Remove da UI os arquivos que não estão mais em progresso
                for (const [path, li] of uiInProgressItems.entries()) {
                    if (!inProgressPaths.has(path)) {
                        li.remove();
                    }
                }

                // Adiciona ou atualiza na UI os arquivos que estão em progresso
                for (const path of inProgressPaths) {
                    const info = data.files_in_progress[path];
                    let li = uiInProgressItems.get(path);

                    if (!li) { // Se o item é novo, cria o elemento
                        li = document.createElement('li');
                        li.className = 'flex flex-col px-4 py-3 border-b border-gray-100 dark:border-gray-700';
                        li.dataset.filepath = path;
                        inProgressList.appendChild(li);
                    }

                    // Atualiza o conteúdo do item com o status mais recente
                    let statusIcon = '<i class="fas fa-cog fa-spin text-blue-500"></i>';
                    if (info.status === 'paused') {
                        statusIcon = '<i class="fas fa-pause-circle text-yellow-500"></i>';
                    }
                    li.innerHTML = `
                        <div class="flex items-center gap-3">
                            <span class="status-icon">${statusIcon}</span>
                            <p class="flex-1 font-medium truncate" title="${path}">${path.split(/[\\/]/).pop()}</p>
                            <span class="progress-percent ml-2 text-xs text-gray-500">${Math.round(info.progress || 0)}%</span>
                        </div>
                        <div class="h-1 mt-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                            <div class="progress-bar h-1 bg-blue-600 rounded-full" style="width: ${info.progress || 0}%;"></div>
                        </div>
                    `;
                }

                // --- GERENCIAMENTO DA LISTA "CONCLUÍDOS" ---
                data.completed_files.forEach(fileInfo => {
                    if (!completedList.querySelector(`li[data-filepath="${fileInfo.output_path}"]`)) {
                        const completedFilename = fileInfo.output_path.split(/[\\/]/).pop();
                        const li = document.createElement('li');
                        li.className = 'group relative flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700';
                        li.dataset.filepath = fileInfo.output_path;
                        li.innerHTML = `
                            <i class="fas fa-check-circle text-green-600"></i>
                            <p class="flex-1 font-medium truncate" title="${fileInfo.output_path}">${completedFilename}</p>
                            <div class="three-dots-menu absolute top-0 right-0 h-full flex items-center px-4 opacity-0 group-hover:opacity-100 cursor-pointer">
                                <i class="fas fa-ellipsis-v text-gray-500"></i>
                            </div>`;
                        completedList.prepend(li);
                    }
                });

                // --- ATUALIZAÇÃO DOS SELOS DE VERIFICAÇÃO NA FILA DE PROCESSAMENTO ---
                // Remove selos antigos para evitar duplicatas
                fileTreeContainer.querySelectorAll('.fa-check-circle').forEach(el => el.remove());
                // Adiciona selo de verificação para todos os arquivos concluídos/ignorados
                allCompletedOrSkippedPaths.forEach(path => {
                    fileTreeContainer.querySelectorAll(`li[data-filepath="${path}"]`).forEach(el => {
                        if (!el.querySelector('.fa-check-circle')) {
                            el.insertAdjacentHTML('beforeend', ' <i class="fas fa-check-circle text-green-600 ml-1"></i>');
                        }
                        el.classList.add('status-completed');
                    });
                });

                // ... resto da função updateProgress (status, finalização, etc)
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
                updateFolderSpinners(data.files_in_progress);
                updateStatusStyles(data.files_in_progress, allCompletedOrSkippedPaths);
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

    // --- NOVO: Elementos do Modal de Continuidade ---
    const continuityModal = document.getElementById('continuity-modal');
    const modalSkipBtn = document.getElementById('modal-skip-btn');
    const modalReprocessBtn = document.getElementById('modal-reprocess-btn');
    const modalEachBtn = document.getElementById('modal-each-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const continuityModalMessage = document.getElementById('continuity-modal-message');

    startBtn.addEventListener('click', async () => {
        allCompletedOrSkippedPaths.clear(); // Limpa o estado ao iniciar
        if (fileQueue.length === 0 || !destinoInput.value) {
            alert('Adicione arquivos/pastas à fila e selecione uma pasta de destino.');
            return;
        }

        const destPath = destinoInput.value;
        const keepStructure = document.getElementById('keep-structure-checkbox').checked;

        // 1. Chama a API para verificar arquivos existentes
        const conflicts = await api.check_existing_files(fileQueue, destPath, keepStructure);
        const existingFiles = conflicts.existing_files || [];
        
        let filesToProcess = [...fileQueue];

        // 2. Se houver conflitos, mostra o modal e aguarda a decisão do usuário
        if (existingFiles.length > 0) {
            continuityModalMessage.textContent = `Detectamos que ${existingFiles.length} arquivo(s) na fila já pode(m) ter sido processado(s). Como deseja continuar?`;
            continuityModal.classList.remove('hidden');

            const userChoice = await new Promise(resolve => {
                modalSkipBtn.onclick = () => resolve('skip');
                modalReprocessBtn.onclick = () => resolve('reprocess');
                modalEachBtn.onclick = () => resolve('each');
                modalCancelBtn.onclick = () => resolve('cancel');
            });

            continuityModal.classList.add('hidden');

            if (userChoice === 'cancel') {
                return; // Interrompe a operação
            }
            if (userChoice === 'skip') {
                const existingSourcePaths = existingFiles.map(f => f.source_path);
                filesToProcess = fileQueue.filter(f => !existingSourcePaths.includes(f.path));
                // Atualiza a UI para os arquivos ignorados
                window.skippedFilesPaths = existingSourcePaths; // Guarda para o updateProgress
                skippedFilesCount = existingFiles.length;
                existingFiles.forEach(fileInfo => {
                    // Adiciona na lista de "Concluídos"
                     const completedFilename = fileInfo.output_path.split(/[\\/]/).pop();
                     const li = document.createElement('li');
                     li.className = 'group relative flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700';
                     li.dataset.filepath = fileInfo.output_path;
                     li.innerHTML = `
                         <i class="fas fa-check-circle text-green-600"></i>
                         <p class="flex-1 font-medium truncate" title="${fileInfo.output_path}">${completedFilename}</p>
                         <div class="three-dots-menu absolute top-0 right-0 h-full flex items-center px-4 opacity-0 group-hover:opacity-100 cursor-pointer">
                             <i class="fas fa-ellipsis-v text-gray-500"></i>
                         </div>`;
                     completedList.prepend(li);
                     // Marca na árvore da esquerda como concluído
                     fileTreeContainer.querySelectorAll(`li[data-filepath="${fileInfo.source_path}"]`).forEach(el => {
                        el.classList.add('status-completed');
                     });
                     allCompletedOrSkippedPaths.add(fileInfo.source_path.replace(/\\/g, '/'));
                });
            } else if (userChoice === 'each') {
                // Perguntar para cada arquivo
                let filesToIgnore = [];
                for (const fileInfo of existingFiles) {
                    // Cria um mini-modal para cada arquivo
                    const fileName = fileInfo.source_path.split(/[\\/]/).pop();
                    continuityModalMessage.textContent = `O arquivo "${fileName}" já possui uma transcrição. O que deseja fazer?`;
                    continuityModal.classList.remove('hidden');
                    // Só mostra os botões relevantes
                    modalSkipBtn.style.display = '';
                    modalReprocessBtn.style.display = '';
                    modalEachBtn.style.display = 'none';
                    modalCancelBtn.style.display = '';
                    const choice = await new Promise(resolve => {
                        modalSkipBtn.onclick = () => resolve('skip');
                        modalReprocessBtn.onclick = () => resolve('reprocess');
                        modalCancelBtn.onclick = () => resolve('cancel');
                    });
                    continuityModal.classList.add('hidden');
                    if (choice === 'cancel') {
                        return;
                    }
                    if (choice === 'skip') {
                        filesToIgnore.push(fileInfo.source_path);
                        // Atualiza a UI para o arquivo ignorado
                        const completedFilename = fileInfo.output_path.split(/[\\/]/).pop();
                        const li = document.createElement('li');
                        li.className = 'group relative flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700';
                        li.dataset.filepath = fileInfo.output_path;
                        li.innerHTML = `
                            <i class="fas fa-check-circle text-green-600"></i>
                            <p class="flex-1 font-medium truncate" title="${fileInfo.output_path}">${completedFilename}</p>
                            <div class="three-dots-menu absolute top-0 right-0 h-full flex items-center px-4 opacity-0 group-hover:opacity-100 cursor-pointer">
                                <i class="fas fa-ellipsis-v text-gray-500"></i>
                            </div>`;
                        completedList.prepend(li);
                        fileTreeContainer.querySelectorAll(`li[data-filepath="${fileInfo.source_path}"]`).forEach(el => {
                            el.classList.add('status-completed');
                        });
                        allCompletedOrSkippedPaths.add(fileInfo.source_path.replace(/\\/g, '/'));
                    }
                }
                filesToProcess = fileQueue.filter(f => !filesToIgnore.includes(f.path));
                window.skippedFilesPaths = filesToIgnore;
                skippedFilesCount = filesToIgnore.length;
            } else { // Reprocessar tudo
                window.skippedFilesPaths = [];
                skippedFilesCount = 0;
            }
        } else {
            window.skippedFilesPaths = [];
            skippedFilesCount = 0;
        }

        // 3. Inicia o processamento com a lista de arquivos final
        if (filesToProcess.length === 0 && skippedFilesCount > 0) {
             alert("Todos os arquivos na fila já foram processados e foram ignorados.");
             totalFilesForProgress = fileQueue.length;
             const progressPercentage = totalFilesForProgress > 0 ? (skippedFilesCount / totalFilesForProgress) * 100 : 0;
             progressBarGeneral.style.width = `${progressPercentage}%`;
             progressTextGeneral.textContent = `Processo Finalizado! ${skippedFilesCount}/${totalFilesForProgress} arquivos processados.`;
             updateUIForState('completed');
             return;
        }

        totalFilesForProgress = fileQueue.length;

        const requestBody = {
            file_list: filesToProcess,
            dest_path: destPath,
            keep_structure: keepStructure,
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
                // Limpa apenas a lista de progresso, a de concluídos pode ter sido populada
                inProgressList.innerHTML = '';
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