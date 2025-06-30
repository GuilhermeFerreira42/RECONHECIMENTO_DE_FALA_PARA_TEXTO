#!/usr/bin/env python3
"""
Script de instalação com verificação de bibliotecas e download automático de modelos do Whisper
"""

import subprocess
import sys
import platform
import importlib.util
import os

def check_installed(package):
    """Verifica se um pacote está instalado"""
    spec = importlib.util.find_spec(package)
    return spec is not None

def run_command(command, description):
    """Executa um comando e mostra a saída em tempo real"""
    print(f"\n{description}...")
    print(f"Executando: {command}")
    print("-" * 60)
    
    try:
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            encoding='utf-8',
            errors='replace'
        )
        
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(line.strip())
        
        process.stdout.close()
        return_code = process.poll()
        
        print("-" * 60)
        if return_code == 0:
            print(f"✅ {description} concluído com sucesso!")
            return True
        else:
            print(f"❌ {description} falhou com código {return_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao executar {description}: {str(e)}")
        return False

def download_all_whisper_models():
    """Baixa todos os modelos do Whisper"""
    print("\n" + "=" * 40)
    print("PASSO 6: BAIXANDO TODOS OS MODELOS DO WHISPER")
    print("=" * 40)
    
    try:
        import whisper
        import torch
    except ImportError:
        print("❌ Whisper ou PyTorch não estão instalados. Execute primeiro as etapas anteriores.")
        return False

    models = ['tiny', 'base', 'small', 'medium', 'large']
    print("Modelos que serão baixados:")
    for m in models:
        print(f"- {m.capitalize()}")

    total_size_mb = {
        'tiny': 39,
        'base': 74,
        'small': 244,
        'medium': 769,
        'large': 1550
    }
    
    total_space = sum(total_size_mb[m] for m in models)
    print(f"\n⚠️ Aviso: Total estimado de espaço necessário: {total_space}MB")
    print("Isso pode demorar vários minutos, dependendo da sua conexão.")
    confirm = input("Deseja continuar? [s/N] ").lower().strip()
    if confirm not in ['s', 'sim', 'y', 'yes']:
        print("⚠️ Download dos modelos pulado pelo usuário.")
        return False

    success = True
    for model_size in models:
        print(f"\nBaixando modelo '{model_size}'...")
        try:
            model = whisper.load_model(model_size)
            print(f"✅ Modelo '{model_size}' baixado e carregado com sucesso!")
            del model
        except Exception as e:
            print(f"❌ Falha ao baixar o modelo '{model_size}': {e}")
            success = False

    print("\n" + "=" * 40)
    print("✅ DOWNLOAD DOS MODELOS CONCLUÍDO")
    print("=" * 40)
    print(f"Os modelos foram salvos em: {get_whisper_cache_path()}")
    print("Você pode excluir modelos não usados para economizar espaço.")
    return success

def get_whisper_cache_path():
    """Retorna o caminho onde os modelos são armazenados"""
    import os
    if os.name == 'nt':  # Windows
        return os.path.join(os.getenv('USERPROFILE'), '.cache', 'whisper')
    else:  # Linux/Mac
        return os.path.join(os.path.expanduser('~'), '.cache', 'whisper')

def main():
    print("=" * 60)
    print("🔧 INSTALADOR DO SISTEMA COM SUPORTE A WHISPER E VOSK")
    print("=" * 60)
    print(f"Sistema: {platform.system()} {platform.release()}")
    print(f"Python: {sys.version}")
    print("-" * 60)

    # Verificação inicial
    print("\n🔍 VERIFICANDO BIBLIOTECAS JÁ INSTALADAS")
    print("-" * 60)
    
    torch_installed = check_installed('torch')
    whisper_installed = check_installed('whisper')
    vosk_installed = check_installed('vosk')
    
    print(f"PyTorch: {'✅ Instalado' if torch_installed else '❌ Não encontrado'}")
    print(f"Whisper: {'✅ Instalado' if whisper_installed else '❌ Não encontrado'}")
    print(f"Vosk: {'✅ Instalado' if vosk_installed else '❌ Não encontrado'}")

    # Instalar PyTorch se necessário
    if not torch_installed:
        print("\n" + "=" * 40)
        print("PASSO 1: INSTALANDO PYTORCH")
        print("=" * 40)
        print("Selecione o tipo de instalação:")
        print("1. Com suporte a GPU (CUDA - Recomendado)")
        print("2. Somente CPU")
        
        choice = input("Digite sua escolha (1/2): ").strip()
        
        if choice == "1":
            success = run_command(
                "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 ",
                "Instalando PyTorch com CUDA"
            )
        else:
            success = run_command(
                "pip install torch",
                "Instalando PyTorch para CPU"
            )
            
        if not success:
            print("❌ Falha crítica na instalação do PyTorch. Abortando.")
            return
    else:
        print("\n✅ Pulando instalação do PyTorch (já instalado)")

    # Instalar Whisper se necessário
    if not whisper_installed:
        print("\n" + "=" * 40)
        print("PASSO 2: INSTALANDO WHISPER (OpenAI)")
        print("=" * 40)
        success = run_command(
            "pip install openai-whisper",
            "Instalando biblioteca Whisper da OpenAI"
        )
        if not success:
            print("❌ Falha crítica na instalação do Whisper. Abortando.")
            return
    else:
        print("\n✅ Pulando instalação do Whisper (já instalado)")

    # Instalar Vosk se necessário
    if not vosk_installed:
        print("\n" + "=" * 40)
        print("PASSO 3: INSTALANDO VOXSK")
        print("=" * 40)
        success = run_command(
            "pip install vosk",
            "Instalando biblioteca Vosk"
        )
        if not success:
            print("⚠️ Falha ao instalar Vosk, mas continuando.")
    else:
        print("\n✅ Pulando instalação do Vosk (já instalado)")

    # Instalar dependências adicionais
    print("\n" + "=" * 40)
    print("PASSO 4: INSTALANDO DEPENDÊNCIAS ADICIONAIS")
    print("=" * 40)
    success = run_command(
        "pip install flask pywebview tqdm",
        "Instalando Flask, pywebview e tqdm"
    )
    if not success:
        print("❌ Falha crítica na instalação de dependências. Abortando.")
        return

    # Baixar modelos do Whisper
    download_all_whisper_models()

    # Mensagem final
    print("\n" + "=" * 60)
    print("🎉 INSTALAÇÃO CONCLUÍDA!")
    print("=" * 60)
    print("Próximos passos:")
    print("1. Execute 'python run.py' para iniciar a aplicação")
    print("2. Todos os modelos do Whisper já estão baixados")
    print("3. Certifique-se de ter o modelo Vosk na pasta vendor/vosk-model/")
    print("4. Para economizar espaço, remova modelos não utilizados de:")
    print(f"   {get_whisper_cache_path()}")

if __name__ == "__main__":
    main()