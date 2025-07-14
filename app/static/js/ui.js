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
        
        function showContextMenu(event, element) {
            event.preventDefault();
            event.stopPropagation();
            currentTargetItem = element;

            const isQueueItem = currentTargetItem.closest('#file-tree-container');
            const isCompletedItem = currentTargetItem.closest('#completed-list');
            const isFile = currentTargetItem.classList.contains('file-item');

            let menuContent = '';

            if (isQueueItem && isFile) {
                menuContent = `
                    <a href="#" id="context-move-top" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Mover para o topo da fila</a>
                    <a href="#" id="context-pause-item" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Pausar este arquivo</a>
                    <div class="my-1 border-t border-gray-100"></div>
                    <a href="#" id="context-open-file" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Mídia Original</a>
                    <a href="#" id="context-open-location" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Local do Arquivo</a>
                    <div class="my-1 border-t border-gray-100"></div>
                    <a href="#" id="context-remove" class="block px-4 py-2 text-red-600 hover:bg-red-100">Remover da Fila</a>
                `;
            } else if (isCompletedItem) {
                 menuContent = `
                    <a href="#" id="context-open-file" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Transcrição (.txt)</a>
                    <a href="#" id="context-open-location" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Local do Arquivo</a>
                `;
            } else {
                return; // Não mostra menu para pastas
            }

            contextMenu.innerHTML = menuContent;

            // Adiciona listeners para as ações
            const openFileBtn = document.getElementById('context-open-file');
            if(openFileBtn) openFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                api.open_file_natively(currentTargetItem.dataset.filepath);
                closeContextMenu();
            });

            const openLocationBtn = document.getElementById('context-open-location');
            if(openLocationBtn) openLocationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                api.open_folder_in_explorer(currentTargetItem.dataset.filepath);
                closeContextMenu();
            });
            
            // A lógica para as novas ações (pausar item, mover) precisará de suporte do backend.
            // Por enquanto, elas não farão nada.

            const { clientX: mouseX, clientY: mouseY } = event;
            contextMenu.style.top = `${mouseY}px`;
            contextMenu.style.left = `${mouseX}px`;
            contextMenu.classList.remove('hidden');
        }

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