Para a Fase 5: Conversão para Aplicação Híbrida:

- o objetivo é validar a nova arquitetura. Os testes não se concentram nas funcionalidades dos botões (isso será na Fase 6), mas sim em garantir que a "ponte" entre o front-end e o back-end com acesso ao sistema está funcionando perfeitamente.

- Aqui estão os testes a serem realizados e os resultados esperados para cada um.

-----

### **Testes e Resultados Esperados para a Fase 5**

| Teste | Ação a ser Realizada | Resultado Esperado (Sucesso) | Possível Causa de Falha (Resultado Negativo) |
| :--- | :--- | :--- | :--- |
| **1. Instalação e Ambiente** | No terminal, execute `pip install -r requirements.txt` após adicionar `pywebview` ao arquivo. | O comando é concluído sem erros. `pywebview` e suas dependências são instalados com sucesso. | Erros de instalação. A causa pode ser uma versão incompatível do Python, problemas de rede ou falta de dependências do sistema operacional que o `pywebview` requer. |
| **2. Inicialização da Janela** | Execute o script `run.py` modificado. | Uma **janela de desktop nativa** é aberta com o título "Painel de Transcrição". A aplicação não abre mais em uma aba do navegador. | Uma aba do navegador ainda é aberta, ou um erro é exibido no terminal e nenhuma janela aparece. Isso geralmente significa que `run.py` ainda está usando `app.run()` ou há um erro de sintaxe no script. |
| **3. Carregamento da Interface** | Observe a janela que foi aberta no teste anterior. | A interface da aplicação (conforme `index.html`) é renderizada corretamente dentro da janela, com todos os botões, títulos e painéis visíveis. | A janela está em branco, exibe um erro "404 Not Found" ou uma mensagem de falha de conexão. Isso indica que o servidor Flask, rodando na thread, não foi iniciado corretamente ou a URL passada para o `pywebview` está incorreta. |
| **4. Validação da Ponte de API** | 1. Execute a aplicação em modo de depuração. \<br\> 2. Clique com o botão direito na janela e abra as "ferramentas de desenvolvedor". \<br\> 3. No console, digite `window.pywebview.api` e pressione Enter. | O console exibe um objeto JavaScript que lista os nomes dos métodos definidos na sua classe `Api` em Python (ex: `{open_file_dialog: ƒ, open_folder_dialog: ƒ, ...}`). **Este é o teste mais crítico da fase.** | O console exibe `undefined` ou um erro. Isso significa que a "ponte" não foi criada. A causa mais provável é um erro na configuração de `pywebview.create_window()` no arquivo `run.py` (o objeto `api` não foi passado corretamente). |
| **5. Teste de Chamada da API** | Com o console de desenvolvedor ainda aberto, execute uma das funções "esqueleto", por exemplo: `window.pywebview.api.open_file_dialog()` | Duas coisas devem acontecer simultaneamente: \<br\> 1. Uma **janela de seleção de arquivos nativa do sistema operacional** aparece na tela. \<br\> 2. No terminal onde você executou `run.py`, a mensagem de depuração (ex: "Função open\_file\_dialog chamada\!") que você colocou no método Python é impressa. | Nenhum seletor de arquivo aparece e/ou nenhuma mensagem é impressa no terminal Python. Isso pode indicar um problema na biblioteca Python usada para criar o diálogo (ex: `tkinter`) ou um erro dentro da própria função no arquivo `app/api.py`. |

### **Critério de Sucesso da Fase 5**

A Fase 5 será considerada um sucesso quando **todos os cinco testes acima forem aprovados**.

O resultado final e esperado é ter uma aplicação de desktop funcional que carrega a interface web, mas que, através do console de desenvolvedor, prova ter uma ponte de comunicação funcional e bidirecional com o back-end Python, pronta para ser utilizada na Fase 6.