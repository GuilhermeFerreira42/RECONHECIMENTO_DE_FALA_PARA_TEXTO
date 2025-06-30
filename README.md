# Reconhecimento de Fala para Texto

[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-orange)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-green)](https://pytorch.org/)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

## 🎯 Descrição
Sistema de reconhecimento de fala para texto com suporte a múltiplos motores de IA: **Whisper (OpenAI)** e **Vosk**. Inclui interface desktop via `pywebview` e seletor dinâmico de modelos.

## 📦 Principais Recursos
- ✅ Suporte a **Whisper** (5 tamanhos de modelo)
- ✅ Suporte a **Vosk** (processamento offline)
- ✅ Seletor dinâmico de modelos na interface
- ✅ Aceleração por GPU (CUDA) para Whisper
- ✅ Interface gráfica intuitiva
- ✅ Suporte a todos os formatos de áudio/vídeo

## 🧠 Modelos Disponíveis

| Modelo        | Tamanho | Velocidade | Precisão | Uso Recomendado        |
|---------------|---------|------------|----------|------------------------|
| `whisper_tiny`| 39MB    | ⚡⚡⚡⚡     | ⭐⭐     | Testes rápidos         |
| `whisper_base`| 74MB    | ⚡⚡⚡      | ⭐⭐⭐   | Uso geral              |
| `whisper_small`| 244MB  | ⚡⚡       | ⭐⭐⭐⭐ | Alta precisão           |
| `whisper_medium`| 769MB | ⚡         | ⭐⭐⭐⭐⭐ | Excelente qualidade     |
| `whisper_large`| 1550MB | 🐢         | ⭐⭐⭐⭐⭐ | Máxima precisão         |
| `vosk`        | ~1GB    | ⚡⚡⚡     | ⭐⭐⭐   | Processamento offline   |

## 🚀 Como Usar

### 1. Instale as dependências
```bash
python install_whisper_vosk.py
```

Ou manualmente:
```bash
# Instalar PyTorch com suporte a GPU (recomendado)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Instalar Whisper e Vosk
pip install openai-whisper vosk flask pywebview tqdm
```

### 2. Execute a aplicação
```bash
python run.py
```

Na primeira execução, os modelos do Whisper serão baixados automaticamente.

### 3. Use o seletor de modelos
No cabeçalho da interface:
1. Clique em "MODELO DE LINGUAGEM"
2. Escolha entre:
   - `whisper_tiny` (mais rápido)
   - `whisper_base` (equilíbrio)
   - `whisper_large` (máxima precisão)
   - `vosk` (offline/rápido)

## 🛠️ Configurações Avançadas
- **Modelos Whisper**: Armazenados em `%USERPROFILE%\.cache\whisper\` (Windows) ou `~/.cache/whisper/` (Linux/Mac)
- **Modelo Vosk**: Deve estar em `vendor/vosk-model/`
- **FFmpeg**: Incluído em `vendor/ffmpeg/`

## 🐛 Solução de Problemas

### Erro: "CUDA out of memory"
- Use modelos menores (`whisper_tiny`, `whisper_base`)
- Processe arquivos menores
- Verifique se outros apps estão usando GPU

### Erro: "Model not found"
- Verifique conexão com internet (para download automático do Whisper)
- Para Vosk, confirme que o modelo está em `vendor/vosk-model/`

### Erro: "FFmpeg not found"
- Verifique se a pasta `vendor/ffmpeg/` existe
- Reinicie a aplicação após instalar FFmpeg

## 📈 Benefícios da Implementação
- ✅ Flexibilidade: escolha entre 6 modelos
- ✅ Desempenho otimizado: GPU para Whisper, CPU para Vosk
- ✅ Interface única: tudo na mesma aplicação
- ✅ Arquitetura escalável: fácil adição de novos modelos

## 📝 Notas Importantes
1. **Primeira execução**: modelos do Whisper são baixados automaticamente (até 2.9GB)
2. **Progresso**: 
   - Vosk mostra progresso real
   - Whisper usa progresso simulado
3. **Memória**: modelos maiores exigem mais RAM/VRAM
4. **Internet**: necessária apenas para download inicial dos modelos Whisper

## 📁 Estrutura do Projeto
```
RECONHECIMENTO_DE_FALA_PARA_TEXTO/
├── app/
│   ├── __init__.py
│   ├── routes.py          # Controladores Flask
│   └── transcriber.py     # Lógica de transcrição
├── vendor/
│   ├── ffmpeg/            # Binários FFmpeg
│   └── vosk-model/        # Modelo Vosk (português)
├── install_whisper_vosk.py # Script de instalação
├── run.py                 # Ponto de entrada
└── README.md
```

## 🎉 Conclusão
O sistema agora oferece **flexibilidade profissional**, permitindo que usuários escolham entre diferentes motores de reconhecimento de fala com base em suas necessidades específicas. A interface permanece intuitiva, enquanto a arquitetura é robusta e facilmente extensível.
```