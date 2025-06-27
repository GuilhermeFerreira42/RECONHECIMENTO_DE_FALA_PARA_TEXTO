import webview
import threading
import time
import socket  # Importa a biblioteca de socket

from app import app
from app.api import Api

def run_flask():
    """Função para rodar o servidor Flask em uma thread separada."""
    # O modo debug do Flask pode, às vezes, interferir no threading.
    # Usar 'debug=False' e 'use_reloader=False' é mais estável para produção.
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

def is_server_ready(host, port, timeout=10):
    """
    Verifica ativamente se o servidor está respondendo no host e porta especificados.
    Tenta se conectar repetidamente por até 'timeout' segundos.
    """
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            # Tenta criar uma conexão de socket
            with socket.create_connection((host, port), timeout=1):
                print(">>> Servidor Flask está pronto e respondendo!")
                return True
        except (socket.timeout, ConnectionRefusedError):
            # Se falhar (timeout ou conexão recusada), espera um pouco e tenta de novo
            time.sleep(0.1)
    
    print("!!! ERRO: O servidor Flask não ficou pronto a tempo.")
    return False

if __name__ == '__main__':
    api = Api()

    # Inicia a thread do servidor Flask
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Inicia a espera ativa, que só continua quando o servidor estiver pronto
    if is_server_ready('127.0.0.1', 5000):
        # O servidor está pronto, agora podemos criar a janela com segurança
        webview.create_window(
            'Painel de Transcrição',
            'http://127.0.0.1:5000',
            js_api=api,
            min_size=(1024, 768)
        )
        webview.start(debug=True)
    else:
        # Se o servidor não iniciou após o timeout, exibe um erro no console
        print("Não foi possível iniciar a aplicação. O servidor web falhou ao iniciar.")