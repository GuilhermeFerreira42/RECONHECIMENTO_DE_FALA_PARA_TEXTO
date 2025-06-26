console.log("ui.js foi carregado.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM totalmente carregado. O script de UI (ui.js) vai começar.");

    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) {
        console.warn("Aviso em ui.js: Elemento 'contextMenu' não encontrado.");
        return;
    }
    console.log("ui.js: Menu de contexto encontrado.");

    let currentTargetItem = null;

    function closeContextMenu() {
        contextMenu.classList.add('hidden');
        currentTargetItem = null;
    }

    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            closeContextMenu();
        }
    });

    document.addEventListener('contextmenu', (e) => {
        const li = e.target.closest('li');
        if (li) {
            e.preventDefault();
            currentTargetItem = li;

            const { clientX: mouseX, clientY: mouseY } = e;
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = contextMenu;

            let top = mouseY;
            let left = mouseX;

            if (mouseX + offsetWidth > innerWidth) left = innerWidth - offsetWidth - 10;
            if (mouseY + offsetHeight > innerHeight) top = innerHeight - offsetHeight - 10;

            contextMenu.style.top = `${top}px`;
            contextMenu.style.left = `${left}px`;
            contextMenu.classList.remove('hidden');
        } else {
            closeContextMenu();
        }
    });

    // Adicione aqui a lógica para os botões do menu de contexto, se necessário
    document.getElementById('context-delete')?.addEventListener('click', () => {
         if (currentTargetItem && confirm('Tem certeza?')) {
             currentTargetItem.remove();
         }
         closeContextMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeContextMenu();
        }
    });
}); 