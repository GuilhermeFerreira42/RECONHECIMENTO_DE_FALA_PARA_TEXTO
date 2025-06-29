#!/usr/bin/env python3
"""
Script de instalação para migração do Vosk para Whisper
Este script facilita a instalação das dependências necessárias para o Whisper.
"""

import subprocess
import sys
import platform

def run_command(command, description):
    """Executa um comando e mostra o resultado"""
    print(f"\n{description}...")
    print(f"Executando: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print("✅ Sucesso!")
        if result.stdout:
            print(f"Saída: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro: {e}")
        if e.stderr:
            print(f"Erro detalhado: {e.stderr}")
        return False

def check_cuda():
    """Verifica se CUDA está disponível"""
    try:
        import torch
        if torch.cuda.is_available():
            print(f"✅ CUDA detectado! GPU: {torch.cuda.get_device_name(0)}")
            return True
        else:
            print("⚠️  CUDA não detectado. O Whisper usará CPU.")
            return False
    except ImportError:
        print("⚠️  PyTorch não instalado ainda.")
        return False

def main():
    print("=" * 60)
    print("MIGRAÇÃO DO VOSK PARA WHISPER - SCRIPT DE INSTALAÇÃO")
    print("=" * 60)
    
    print(f"\nSistema: {platform.system()} {platform.release()}")
    print(f"Python: {sys.version}")
    
    # Verificar se CUDA está disponível
    cuda_available = check_cuda()
    
    print("\n" + "=" * 40)
    print("PASSO 1: Removendo dependências antigas")
    print("=" * 40)
    
    # Remover vosk se estiver instalado
    run_command("pip uninstall vosk -y", "Removendo biblioteca Vosk")
    
    print("\n" + "=" * 40)
    print("PASSO 2: Instalando PyTorch")
    print("=" * 40)
    
    # Instalar PyTorch com suporte a CUDA se disponível
    if cuda_available:
        print("Instalando PyTorch com suporte a CUDA...")
        success = run_command(
            "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118",
            "Instalando PyTorch com CUDA"
        )
    else:
        print("Instalando PyTorch para CPU...")
        success = run_command(
            "pip install torch torchvision torchaudio",
            "Instalando PyTorch para CPU"
        )
    
    if not success:
        print("❌ Falha na instalação do PyTorch. Abortando.")
        return
    
    print("\n" + "=" * 40)
    print("PASSO 3: Instalando Whisper")
    print("=" * 40)
    
    success = run_command("pip install openai-whisper", "Instalando OpenAI Whisper")
    if not success:
        print("❌ Falha na instalação do Whisper. Abortando.")
        return
    
    print("\n" + "=" * 40)
    print("PASSO 4: Instalando outras dependências")
    print("=" * 40)
    
    success = run_command("pip install -r requirements.txt", "Instalando dependências do requirements.txt")
    if not success:
        print("❌ Falha na instalação das dependências. Verifique o requirements.txt")
        return
    
    print("\n" + "=" * 40)
    print("PASSO 5: Verificação final")
    print("=" * 40)
    
    # Verificar se tudo foi instalado corretamente
    try:
        import torch
        import whisper
        print("✅ PyTorch instalado com sucesso!")
        print(f"   Versão PyTorch: {torch.__version__}")
        print(f"   CUDA disponível: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
        
        print("✅ Whisper instalado com sucesso!")
        
        # Testar carregamento de um modelo pequeno
        print("Testando carregamento do modelo Whisper...")
        model = whisper.load_model("tiny")
        print("✅ Modelo Whisper carregado com sucesso!")
        
    except ImportError as e:
        print(f"❌ Erro ao importar bibliotecas: {e}")
        return
    except Exception as e:
        print(f"❌ Erro ao testar Whisper: {e}")
        return
    
    print("\n" + "=" * 60)
    print("🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!")
    print("=" * 60)
    print("\nPróximos passos:")
    print("1. Execute 'python run.py' para iniciar a aplicação")
    print("2. O modelo Whisper será baixado automaticamente na primeira execução")
    print("3. Para melhor precisão, você pode alterar o modelo em app/routes.py:")
    print("   - 'base' (padrão): bom equilíbrio entre velocidade e precisão")
    print("   - 'medium': maior precisão, um pouco mais lento")
    print("   - 'large': máxima precisão, mais lento e requer mais memória")
    print("\nPara remover o modelo Vosk antigo, você pode deletar a pasta:")
    print("   vendor/vosk-model/")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main() 