// Conteúdo de DEPURAÇÃO de app/static/js/main.js
console.log("DEBUG: main.js foi carregado.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: DOM totalmente carregado.");

    const startButton = document.getElementById('start-btn');
    if (!startButton) {
        return console.error("FALHA CRÍTICA: Botão com id 'start-btn' não encontrado no HTML.");
    }
    console.log("DEBUG: Botão 'start-btn' encontrado.");

    startButton.addEventListener('click', () => {
        console.log("DEBUG: Botão 'INICIAR' foi clicado.");

        const sourcePath = "C:\\Users\\Usuario\\Desktop\\TesteApp\\Origem";
        const destPath = "C:\\Users\\Usuario\\Desktop\\TesteApp\\Destino";

        console.log(`DEBUG: Enviando requisição para /start-processing...`);

        fetch('/start-processing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_path: sourcePath,
                dest_path: destPath,
            }),
        })
        .then(response => {
            console.log("DEBUG: Recebemos uma resposta inicial do servidor (passo 1 do .then).");
            console.log("DEBUG: Status da resposta:", response.status);
            console.log("DEBUG: Resposta OK?", response.ok);

            if (!response.ok) {
                // Se a resposta não for OK, o erro será lançado e capturado pelo .catch
                throw new Error(`Erro de HTTP! Status: ${response.status}`);
            }
            // Se a resposta for OK, tentamos convertê-la para JSON
            return response.json();
        })
        .then(data => {
            // Se a conversão para JSON funcionar, este bloco será executado
            console.log("--- SUCESSO! ---");
            console.log("DEBUG: Resposta JSON recebida do servidor (passo 2 do .then):", data);
            alert('SUCESSO: Processo iniciado. Verifique o terminal e o console do navegador.');
        })
        .catch(error => {
            // Se qualquer passo anterior falhar, este bloco será executado
            console.error("--- ERRO ---");
            console.error("DEBUG: Ocorreu um erro na promessa do fetch:", error);
            alert('FALHA: Não foi possível iniciar o processo. Verifique o console do navegador (F12) para o erro exato.');
        });
        
        console.log("DEBUG: Requisição fetch foi enviada. Aguardando resposta...");
    });
});