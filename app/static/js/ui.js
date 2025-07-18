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
            const isFile = currentTargetItem.dataset.filepath;

            // Determina o estado geral da aplicação
            const isProcessing = !document.getElementById('start-btn').classList.contains('hidden');

            let menuContent = '';

            if (isCompletedItem) {
                menuContent = `
                    <a href="#" data-action="open-file" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Transcrição (.txt)</a>
                    <a href="#" data-action="open-location" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Local do Arquivo</a>
                `;
            } else if (isFile) { // Para itens na Fila ou Em Progresso
                // Ações comuns
                menuContent += `<a href="#" data-action="open-file" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Mídia Original</a>`;
                menuContent += `<a href="#" data-action="open-location" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Abrir Local do Arquivo</a>`;
                
                if (isProcessing) { // Se o processo principal está parado/ocioso
                    menuContent += `<div class="my-1 border-t border-gray-100"></div>`;
                    menuContent += `<a href="#" data-action="move-top" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Mover para o topo</a>`;
                    menuContent += `<a href="#" data-action="remove" class="block px-4 py-2 text-red-600 hover:bg-red-100">Remover da Fila</a>`;
                } else { // Se o processo principal está rodando ou pausado
                    menuContent += `<div class="my-1 border-t border-gray-100"></div>`;
                    menuContent += `<a href="#" data-action="prioritize" class="block px-4 py-2 text-blue-700 hover:bg-blue-100 font-semibold">Processar este agora</a>`;
                    
                    // Verifica o status do item específico (pausado ou rodando)
                    const isPaused = currentTargetItem.querySelector('.fa-pause-circle');
                    if (isPaused) {
                         menuContent += `<a href="#" data-action="resume-item" class="block px-4 py-2 text-green-600 hover:bg-green-100">Retomar este arquivo</a>`;
                    } else {
                         menuContent += `<a href="#" data-action="pause-item" class="block px-4 py-2 text-yellow-600 hover:bg-yellow-100">Pausar este arquivo</a>`;
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

        // NOVO: Listener de clique centralizado para o menu de contexto
        contextMenu.addEventListener('click', async (e) => {
            e.preventDefault();
            const action = e.target.dataset.action;
            if (!action || !currentTargetItem) return;

            const filePath = currentTargetItem.dataset.filepath;

            switch (action) {
                case 'open-file':
                    api.open_file_natively(filePath);
                    break;
                case 'open-location':
                    api.open_folder_in_explorer(filePath);
                    break;
                case 'remove':
                    // Lógica para remover da fila (precisaria ser implementada em main.js)
                    console.log(`Remover: ${filePath}`);
                    break;
                case 'move-top':
                     // Lógica para mover ao topo (precisaria ser implementada em main.js)
                    console.log(`Mover ao topo: ${filePath}`);
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
                case 'resume-item': // NOVA AÇÃO
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