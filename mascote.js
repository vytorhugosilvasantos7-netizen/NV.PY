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

// Ação de Login
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;

    if (email && pass.length >= 6) {
        window.location.href = 'anotacoes.html';
    } else {
        alert('Por favor, preencha o e-mail e uma senha de no mínimo 6 caracteres.');
    }
}

// Ação de Cadastro
function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;

    if (name && email && pass.length >= 6) {
        alert('Conta criada com sucesso! Redirecionando...');
        window.location.href = 'anotacoes.html';
    } else {
        alert('Preencha todos os campos corretamente.');
    }
}

// Ação de Recuperar Senha
function handleForgot(event) {
    event.preventDefault();
    const email = document.getElementById('forgotEmail').value;

    if (email) {
        alert(`Instruções de recuperação enviadas para: ${email}`);
        switchTab('login');
    }
}