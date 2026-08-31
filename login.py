import sqlite3
from src.banco_de_dados import conectar, gerar_hash

def cadastrar_usuario():
    print("\n--- 📝 CADASTRO DE NOVO USUÁRIO ---")
    email = input("Digite seu e-mail: ").strip().lower()
    senha = input("Crie sua senha: ")
    
    if len(senha) < 6:
        print("❌ A senha deve ter no mínimo 6 caracteres!")
        return

    senha_criptografada = gerar_hash(senha)
    
    try:
        with conectar() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO usuarios (email, senha_hash) VALUES (?, ?)",
                (email, senha_criptografada)
            )
            conn.commit()
            print("\n✅ Usuário cadastrado com sucesso! A senha foi salva com criptografia Hash.")
    except sqlite3.IntegrityError:
        print("\n❌ Este e-mail já está cadastrado no sistema!")

def fazer_login() -> tuple[int, str] | None:
    """
    Retorna uma tupla (id_usuario, email) se o login der certo,
    ou None se falhar.
    """
    print("\n--- 🔐 LOGIN SEGURO ---")
    email = input("E-mail: ").strip().lower()
    senha = input("Senha: ")
    
    senha_criptografada = gerar_hash(senha)
    
    with conectar() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email FROM usuarios WHERE email = ? AND senha_hash = ?",
            (email, senha_criptografada)
        )
        usuario = cursor.fetchone()
        
        if usuario:
            print(f"\n🚀 Acesso liberado! Bem-vindo, {usuario[1]}.")
            return usuario[0], usuario[1]  # Retorna ID e E-mail
        else:
            print("\n❌ E-mail ou senha incorretos. Tente novamente!")
            return None