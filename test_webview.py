import webview
import time

class TestApi:
    """Uma API de teste muito simples."""
    def show_message(self):
        print(">>> SUCESSO! A chamada da API do JavaScript para o Python funcionou!")
        return "Mensagem recebida do Python com sucesso às " + time.strftime("%H:%M:%S")

if __name__ == '__main__':
    # Cria uma instância da nossa API de teste
    api = TestApi()

    # HTML extremamente simples que será carregado diretamente
    html_content = """
    <!DOCTYPE html>
    <html>
    <head><title>Teste de API</title></head>
    <body>
        <h1>Teste Mínimo do PyWebview</h1>
        <p>Clique no botão para testar a chamada da API para o Python.</p>
        <button onclick=\"testarApi()\">Testar API</button>
        <p>Resposta do Python: <strong id=\"resposta\">...</strong></p>

        <script>
            function testarApi() {
                // Verifica se a API foi injetada
                if (window.pywebview && window.pywebview.api) {
                    console.log('API encontrada. Chamando show_message...');
                    // Chama a função Python e aguarda a resposta (promise)
                    window.pywebview.api.show_message().then(function(response) {
                        // Exibe a resposta do Python na página
                        document.getElementById('resposta').innerText = response;
                        console.log('Resposta recebida do Python:', response);
                    });
                } else {
                    let msg = 'ERRO: window.pywebview.api não foi encontrado!';
                    document.getElementById('resposta').innerText = msg;
                    console.error(msg);
                }
            }
        </script>
    </body>
    </html>
    """

    # Cria a janela, passando o HTML diretamente e a API
    window = webview.create_window(
        'Janela de Teste',
        html=html_content,
        js_api=api
    )
    webview.start(debug=True) 