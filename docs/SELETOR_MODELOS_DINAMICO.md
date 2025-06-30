
# 🧠 Seletor de Modelos Dinâmico

## 🎯 Objetivo
Este documento detalha a implementação do **seletor dinâmico de modelos** no sistema, permitindo ao usuário alternar entre diferentes motores e tamanhos de modelos de reconhecimento de fala.

---

## 🔁 Suporte a Múltiplos Modelos

O sistema agora suporta os seguintes motores de IA:

| Motor        | Tipo       | Requer Internet | Processamento | Precisão |
|-------------|------------|------------------|----------------|-----------|
| `whisper_tiny` | OpenAI     | Sim              | CPU/GPU         | Média     |
| `whisper_base` | OpenAI     | Sim              | CPU/GPU         | Boa       |
| `whisper_small`| OpenAI     | Sim              | CPU/GPU         | Alta      |
| `whisper_medium`| OpenAI    | Sim              | CPU/GPU         | Muito Alta|
| `whisper_large`| OpenAI     | Sim              | CPU/GPU         | Máxima    |
| `vosk`         | Kaldi-based| Não              | Apenas CPU      | Alta      |

> 💡 Todos os modelos podem ser usados **sem alterações no código**, apenas selecionando via interface gráfica.

---

## 🧱 Arquitetura Interna

### 1. **ModelManager**
Gerencia o cache de modelos para evitar carregamentos repetidos:
```python
class ModelManager:
    def __init__(self):
        self.loaded_models = {}  # Cache de modelos
        self.vosk_model_path = "vendor/vosk-model/"

    def get_model(self, model_name: str):
        # Carrega modelo se não estiver em cache
```

### 2. **TranscriptionManager**
Lida com a transcrição com base no nome do modelo:
```python
class TranscriptionManager:
    def __init__(self, model_name, model_manager, ...):
        self.model_name = model_name
        self.model_manager = model_manager
        self.model = self.model_manager.get_model(model_name)

    def _transcribe_with_whisper(self, temp_wav_file):
        # Usa PyTorch + CUDA se disponível

    def _transcribe_with_vosk(self, temp_wav_file):
        # Progresso real com base na posição do áudio
```

### 3. **Dispatcher de Transcrição**
Seleciona automaticamente o motor correto:
```python
# No método _transcribe_single_file()
if self.model_name.startswith('whisper'):
    transcript_text = self._transcribe_with_whisper(temp_wav_file)
elif self.model_name == 'vosk':
    transcript_text = self._transcribe_with_vosk(temp_wav_file)
```

---

## 🖥️ Interface do Usuário

### Localização:
- Na barra superior da aplicação desktop/web

### Opções Disponíveis:
- `whisper_tiny`: ideal para testes rápidos
- `whisper_base`: bom equilíbrio (padrão)
- `whisper_large`: máxima precisão
- `vosk`: processamento offline rápido

### Funcionalidade:
- Atualiza automaticamente o modelo usado
- Mostra feedback visual durante mudança
- Mantém configurações entre reinicializações

---

## ⚙️ Configuração Padrão

Se nenhum modelo for selecionado, o sistema usa:
```python
WHISPER_MODEL = load_whisper_model("base")  # PADRÃO
```

Você pode alterar isso editando:
```
app/routes.py
```

---

## 📈 Comparação de Performance

| Modelo        | Tamanho | Velocidade | Uso de RAM | GPU | Precisão |
|---------------|---------|------------|------------|-----|----------|
| `whisper_tiny`| 39MB    | ⚡⚡⚡⚡     | Baixo      | Opcional | ⭐⭐     |
| `whisper_base`| 74MB    | ⚡⚡⚡      | Baixo      | Opcional | ⭐⭐⭐   |
| `whisper_small`| 244MB  | ⚡⚡       | Médio      | Recomendada | ⭐⭐⭐⭐ |
| `whisper_medium`| 769MB | ⚡         | Alto       | Recomendada | ⭐⭐⭐⭐ |
| `whisper_large`| 1550MB | 🐢         | Muito alto | Necessária | ⭐⭐⭐⭐⭐ |
| `vosk`        | ~1GB    | ⚡⚡⚡     | Médio      | Não | ⭐⭐⭐     |

---

## 🛠️ Solução de Problemas

### Erro: "Model not found"
- **Whisper**: Verifique sua conexão com internet
- **Vosk**: Confirme que o modelo está em `vendor/vosk-model/`

### Erro: "CUDA out of memory"
- Use modelos menores (`whisper_tiny`, `whisper_base`)
- Desative uso de GPU nas configurações
- Reduza tamanho dos arquivos processados

### Performance Lenta
- Troque para modelo menor
- Certifique-se de que o FFmpeg está otimizado
- Feche outros programas concorrentes

---

## 📌 Benefícios da Implementação

### Para Usuários
- ✅ Flexibilidade total na escolha do modelo
- ✅ Interface intuitiva e amigável
- ✅ Processamento offline com Vosk
- ✅ Otimização por caso de uso (velocidade vs precisão)

### Para Desenvolvedores
- ✅ Arquitetura modular e extensível
- ✅ Cache inteligente para performance
- ✅ Código limpo e bem estruturado
- ✅ Fácil adição de novos modelos

---

## 🔄 Próximos Passos (Opcional)

| Melhoria                     | Descrição                                  |
|------------------------------|--------------------------------------------|
| 🧩 Adicionar novos idiomas   | Permitir seleção de idioma                 |
| 🧭 Suporte a HuggingFace     | Integração com mais modelos de IA          |
| 📊 Estatísticas de uso       | Mostrar qual modelo é mais usado           |
| 🧠 Inteligência artificial   | Sugestões automáticas de modelo            |
| 🧪 Modo benchmark            | Comparar velocidade e precisão entre modelos|

---

## 📄 Histórico de Atualizações

| Versão | Data       | Descrição                                |
|--------|------------|------------------------------------------|
| 1.0    | 2024-03-15 | Implementação inicial                    |
| 1.1    | 2024-03-18 | Adicionado Whisper Tiny e Base           |
| 1.2    | 2024-03-20 | Suporte completo a todos os modelos      |
| 1.3    | 2024-03-22 | Integração com interface gráfica         |
| 1.4    | 2024-03-25 | Cache inteligente e melhorias de desempenho |
| 1.5    | 2024-03-28 | Suporte a múltiplas threads              |
