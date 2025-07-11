console.log("ui.js (Fase 6) foi carregado.");

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
        console.log("ui.js: API encontrada com sucesso!");
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;

        let currentTargetItem = null;

        function closeContextMenu() {
            contextMenu.classList.add('hidden');
            currentTargetItem = null;
        }
        
        function showContextMenu(event, element) {
            event.preventDefault();
            currentTargetItem = element;

            const isQueueItem = currentTargetItem.closest('#queue-list');
            const isCompletedItem = currentTargetItem.closest('#completed-list');

            let openFileText = isQueueItem ? "Abrir Mídia Original" : "Abrir Transcrição (.txt)";

            let menuContent = `
                <a href="#" id="context-open-file" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">${openFileText}</a>
                <a href="#" id="context-open-location" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Local do Arquivo</a>
            `;
            
            if (isQueueItem) {
                menuContent += `<a href="#" id="context-remove" class="block px-4 py-2 text-red-600 hover:bg-red-100">Remover da Fila</a>`;
            }
            contextMenu.innerHTML = menuContent;

            document.getElementById('context-open-file').addEventListener('click', (e) => {
                e.preventDefault();
                if (currentTargetItem) {
                    api.open_file_natively(currentTargetItem.dataset.filepath);
                }
                closeContextMenu();
            });
            
            document.getElementById('context-open-location').addEventListener('click', (e) => {
                e.preventDefault();
                if (currentTargetItem) {
                    api.open_folder_in_explorer(currentTargetItem.dataset.filepath);
                }
                closeContextMenu();
            });
            
            if (isQueueItem) {
                document.getElementById('context-remove').addEventListener('click', (e) => {
                    e.preventDefault();
                    if (currentTargetItem && !isProcessing) {
                         currentTargetItem.remove();
                    }
                    closeContextMenu();
                });
            }
            
            const { clientX: mouseX, clientY: mouseY } = event;
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = contextMenu;

            let top = mouseY;
            let left = mouseX;
            if (mouseX + offsetWidth > innerWidth) left = innerWidth - offsetWidth - 10;
            if (mouseY + offsetHeight > innerHeight) top = innerHeight - offsetHeight - 10;

            contextMenu.style.top = `${top}px`;
            contextMenu.style.left = `${left}px`;
            contextMenu.classList.remove('hidden');
        }

        document.addEventListener('click', (e) => {
            const threeDotsMenu = e.target.closest('.three-dots-menu');
            if (threeDotsMenu) {
                e.stopPropagation();
                const li = e.target.closest('li');
                if(li) {
                    showContextMenu(e, li);
                }
                return;
            }

            if (!contextMenu.contains(e.target)) {
                closeContextMenu();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            const li = e.target.closest('li');

            if (li && li.dataset.filepath) {
                showContextMenu(e, li);
            } else {
                closeContextMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeContextMenu();
            }
        });
    } catch (error) {
        console.error("ui.js: API não encontrada após timeout.", error);
        alert("Erro crítico: Comunicação com o back-end falhou.");
    }
}); 