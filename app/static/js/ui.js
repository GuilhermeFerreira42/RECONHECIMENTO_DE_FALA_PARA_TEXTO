console.log("ui.js (Atualizado) foi carregado.");

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
    try {
        const api = await waitForPywebviewApi();
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;

        let currentTargetItem = null;

        function closeContextMenu() {
            contextMenu.classList.add('hidden');
            currentTargetItem = null;
        }
        
        // ATUALIZADO: Lógica do menu de contexto unificada e inteligente
        function showContextMenu(event, element) {
            event.preventDefault();
            event.stopPropagation();
            currentTargetItem = element;

            const isCompletedItem = currentTargetItem.closest('#completed-list');
            const isInProgressItem = currentTargetItem.closest('#in-progress-list');
            const isQueueItem = currentTargetItem.closest('#file-tree-container');
            const isFile = currentTargetItem.dataset.filepath;

            // Determina se o processo principal está ocioso ou rodando/pausado
            const isProcessingIdle = document.getElementById('start-btn').offsetParent !== null;

            let menuContent = '';

            if (isCompletedItem) {
                menuContent = `
                    <a href="#" data-action="open-file" class="flex items-center gap-3 px-4 py-2 text-gray-800 hover:bg-gray-100"><i class="fas fa-file-alt w-4"></i>Abrir Transcrição (.txt)</a>
                    <a href="#" data-action="open-location" class="flex items-center gap-3 px-4 py-2 text-gray-800 hover:bg-gray-100"><i class="fas fa-folder-open w-4"></i>Abrir Local do Arquivo</a>
                `;
            } else if (isFile) { // Para itens na Fila ou Em Progresso
                // Ações comuns
                menuContent += `<a href="#" data-action="open-file" class="flex items-center gap-3 px-4 py-2 text-gray-800 hover:bg-gray-100"><i class="fas fa-play-circle w-4"></i>Abrir Mídia Original</a>`;
                menuContent += `<a href="#" data-action="open-location" class="flex items-center gap-3 px-4 py-2 text-gray-800 hover:bg-gray-100"><i class="fas fa-folder-open w-4"></i>Abrir Local do Arquivo</a>`;
                
                if (isProcessingIdle) { // Se o processo principal está parado/ocioso
                    menuContent += `<div class="my-1 border-t border-gray-100"></div>`;
                    menuContent += `<a href="#" data-action="move-top" class="flex items-center gap-3 px-4 py-2 text-gray-800 hover:bg-gray-100"><i class="fas fa-angle-double-up w-4"></i>Mover para o topo</a>`;
                    menuContent += `<a href="#" data-action="remove" class="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-100"><i class="fas fa-trash-alt w-4"></i>Remover da Fila</a>`;
                } else { // Se o processo principal está rodando ou pausado
                    menuContent += `<div class="my-1 border-t border-gray-100"></div>`;
                    menuContent += `<a href="#" data-action="prioritize" class="flex items-center gap-3 px-4 py-2 text-blue-700 hover:bg-blue-100 font-semibold"><i class="fas fa-star w-4"></i>Processar este agora</a>`;

                    const isPaused = currentTargetItem.querySelector('.fa-pause-circle') || (isQueueItem && currentTargetItem.querySelector('.queue-status-icon .fa-pause-circle'));

                    if (isPaused) {
                         menuContent += `<a href="#" data-action="resume-item" class="flex items-center gap-3 px-4 py-2 text-green-600 hover:bg-green-100"><i class="fas fa-play w-4"></i>Retomar este arquivo</a>`;
                    } else {
                         menuContent += `<a href="#" data-action="pause-item" class="flex items-center gap-3 px-4 py-2 text-yellow-600 hover:bg-yellow-100"><i class="fas fa-pause w-4"></i>Pausar este arquivo</a>`;
                    }
                }
            } else {
                return; // Não mostra menu se não for um item de arquivo válido
            }

            contextMenu.innerHTML = menuContent;
            // Posiciona e exibe o menu
            const { clientX: mouseX, clientY: mouseY } = event;
            contextMenu.style.top = `${mouseY}px`;
            contextMenu.style.left = `${mouseX}px`;
            contextMenu.classList.remove('hidden');
        }

        // NOVO: Listener de clique centralizado que despacha eventos para main.js
        contextMenu.addEventListener('click', async (e) => {
            e.preventDefault();
            const link = e.target.closest('a');
            if (!link || !currentTargetItem) return;

            const action = link.dataset.action;
            const filePath = currentTargetItem.dataset.filepath;

            switch (action) {
                case 'open-file':
                    api.open_file_natively(filePath);
                    break;
                case 'open-location':
                    api.open_folder_in_explorer(filePath);
                    break;
                case 'remove':
                case 'move-top':
                    // Dispara um evento para main.js tratar a manipulação da fila
                    document.dispatchEvent(new CustomEvent('queue:action', { 
                        detail: { action, filePath } 
                    }));
                    break;
                case 'prioritize':
                    await fetch('/prioritize-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file_path: filePath })
                    });
                    break;
                case 'pause-item':
                    await fetch('/pause-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file_path: filePath })
                    });
                    break;
                case 'resume-item':
                    await fetch('/resume-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file_path: filePath })
                    });
                    break;
            }
            closeContextMenu();
        });

        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                closeContextMenu();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            const li = e.target.closest('li[data-filepath]');
            if (li) {
                showContextMenu(e, li);
            } else {
                closeContextMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeContextMenu();
        });

    } catch (error) {
        console.error("ui.js: API não encontrada.", error);
    }
}); 