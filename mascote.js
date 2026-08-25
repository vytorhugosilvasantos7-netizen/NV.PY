// Criptografia SHA-256 para proteger a senha salva
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Alternar entre as abas do formulário
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

// CADASTRO: Salva o e-mail com a senha vinculada
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const rawPass = document.getElementById('regPassword').value;

    if (!name || !email || rawPass.length < 6) {
        alert('Por favor, preencha todos os campos e use uma senha com no mínimo 6 caracteres.');
        return;
    }

    const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');

    // Verifica se o e-mail já existe
    const userExists = users.some(u => u.email === email);
    if (userExists) {
        alert('Este e-mail já possui uma conta cadastrada. Caso tenha esquecido a senha, será necessário cadastrar um novo e-mail.');
        return;
    }

    // Criptografa e vincula a senha ao usuário
    const passwordHash = await hashPassword(rawPass);

    users.push({ 
        name, 
        email, 
        passHash: passwordHash 
    });
    
    localStorage.setItem('nvpey_users', JSON.stringify(users));

    alert('Conta criada com sucesso! Faça login para continuar.');
    
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = '';
    switchTab('login');
}

// LOGIN: Valida se o e-mail e a senha coincidem
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const rawPass = document.getElementById('loginPassword').value;

    const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');
    const inputHash = await hashPassword(rawPass);

    // Busca usuário onde e-mail E senha bate exatamente
    const user = users.find(u => u.email === email && u.passHash === inputHash);

    if (user) {
        localStorage.setItem('nvpey_logged_user', JSON.stringify({
            name: user.name,
            email: user.email
        }));
        
        window.location.href = 'anotacoes.html';
    } else {
        const emailExists = users.some(u => u.email === email);
        if (emailExists) {
            alert('Senha incorreta para este e-mail.');
        } else {
            alert('Conta não encontrada. Crie uma conta na aba "Criar Conta".');
        }
    }
}

// ESQUECEU A SENHA: Avisa que é necessário criar uma nova conta com outro e-mail
function handleForgot(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');
    const user = users.find(u => u.email === email);

    if (user) {
        alert('Não é possível redefinir a senha deste e-mail por questões de segurança. Por favor, crie uma nova conta utilizando outro e-mail.');
        switchTab('register');
    } else {
        alert('Este e-mail não consta em nosso sistema.');
    }
}