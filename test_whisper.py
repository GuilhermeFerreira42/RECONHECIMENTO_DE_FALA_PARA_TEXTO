#!/usr/bin/env python3
"""
Script de teste para verificar se o Whisper está funcionando
"""

def test_whisper_installation():
    """Testa se o Whisper está instalado e funcionando"""
    try:
        import whisper
        print("✅ Whisper importado com sucesso!")
        print(f"   Versão: {whisper.__version__}")
        return True
    except ImportError as e:
        print(f"❌ Erro ao importar Whisper: {e}")
        return False

def test_torch_installation():
    """Testa se o PyTorch está instalado e funcionando"""
    try:
        import torch
        print("✅ PyTorch importado com sucesso!")
        print(f"   Versão: {torch.__version__}")
        print(f"   CUDA disponível: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
        return True
    except ImportError as e:
        print(f"❌ Erro ao importar PyTorch: {e}")
        return False

def test_model_loading():
    """Testa se consegue carregar um modelo Whisper"""
    try:
        import whisper
        print("\nTestando carregamento do modelo...")
        model = whisper.load_model("tiny")
        print("✅ Modelo 'tiny' carregado com sucesso!")
        return True
    except Exception as e:
        print(f"❌ Erro ao carregar modelo: {e}")
        return False

def main():
    print("=" * 50)
    print("TESTE DE INSTALAÇÃO DO WHISPER")
    print("=" * 50)
    
    # Testar imports
    whisper_ok = test_whisper_installation()
    torch_ok = test_torch_installation()
    
    if whisper_ok and torch_ok:
        # Testar carregamento de modelo
        model_ok = test_model_loading()
        
        if model_ok:
            print("\n" + "=" * 50)
            print("🎉 TODOS OS TESTES PASSARAM!")
            print("O Whisper está pronto para uso!")
            print("=" * 50)
        else:
            print("\n⚠️  Whisper instalado mas modelo não carregou")
    else:
        print("\n❌ Instalação incompleta. Execute:")
        print("   pip install openai-whisper torch")

if __name__ == "__main__":
    main() 