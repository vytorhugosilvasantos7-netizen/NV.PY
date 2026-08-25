// Alternar abas entre Login, Criar Conta e Esqueci a Senha
function switchTab(tabName) {
    const forms = document.querySelectorAll('.auth-form');
    const buttons = document.querySelectorAll('.tab-btn');

    forms.forEach(form => form.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));

    if (tabName === 'login') {
        document.getElementById('loginForm').classList.add('active');
        if (buttons[0]) buttons[0].classList.add('active');
    } else if (tabName === 'register') {
        document.getElementById('registerForm').classList.add('active');
        if (buttons[1]) buttons[1].classList.add('active');
    } else if (tabName === 'forgot') {
        document.getElementById('forgotForm').classList.add('active');
    }
}

// Ação de Cadastro (Salva os dados no navegador)
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPassword').value;

    if (!name || !email || pass.length < 6) {
        alert('Por favor, preencha todos os campos e use uma senha de no mínimo 6 caracteres.');
        return;
    }

    // Busca usuários já cadastrados no localStorage
    const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');

    // Verifica se o e-mail já foi cadastrado
    const userExists = users.some(u => u.email === email);
    if (userExists) {
        alert('Este e-mail já está cadastrado! Faça login ou recupere sua senha.');
        switchTab('login');
        return;
    }

    // Salva o novo usuário
    users.push({ name, email, pass });
    localStorage.setItem('nvpey_users', JSON.stringify(users));

    alert('Conta criada com sucesso! Agora você pode fazer login.');
    
    // Preenche o e-mail no formulário de login e muda para a aba de login
    document.getElementById('loginEmail').value = email;
    switchTab('login');
}

// Ação de Login (Valida contra os dados salvos)
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPassword').value;

    // Busca os usuários cadastrados
    const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');

    // Procura o usuário com o e-mail e a senha informados
    const user = users.find(u => u.email === email && u.pass === pass);

    if (user) {
        // Salva a sessão do usuário logado
        localStorage.setItem('nvpey_logged_user', JSON.stringify(user));
        
        // Redireciona para o painel de anotações
        window.location.href = 'anotacoes.html';
    } else {
        // Verifica se o e-mail existe mas a senha está errada
        const emailExists = users.some(u => u.email === email);
        if (emailExists) {
            alert('Senha incorreta! Tente novamente.');
        } else {
            alert('Conta não encontrada! Por favor, vá na aba "Criar Conta" para se cadastrar primeiro.');
        }
    }
}

// Ação de Recuperar Senha (Verifica se o e-mail está cadastrado)
function handleForgot(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');
    const user = users.find(u => u.email === email);

    if (user) {
        alert(`Instruções de recuperação foram enviadas para: ${email}`);
        switchTab('login');
    } else {
        alert('Este e-mail não está cadastrado em nossa plataforma.');
    }
}