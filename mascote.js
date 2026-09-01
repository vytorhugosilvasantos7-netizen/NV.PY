/* =========================================================
   HASHING SEGURO: PBKDF2 com salt aleatório por usuário
   ========================================================= */
// Reduzido para 15.000 iterações para evitar travamentos/congelamento 
// na thread principal do navegador.
const PBKDF2_ITERATIONS = 15000;

function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function generateSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return bufferToHex(salt);
}

function hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

async function hashPassword(password, saltHex) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: hexToBuffer(saltHex),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    return bufferToHex(derivedBits);
}

/* =========================================================
   TOASTS — substitui os alert() por notificações discretas
   ========================================================= */
const toastStack = document.getElementById('toastStack');

function showToast(message, type = 'info', duration = 4200) {
    if (!toastStack) { alert(message); return; }

    const icons = {
        info: 'fa-circle-info',
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    toastStack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

/* =========================================================
   VALIDAÇÃO DE E-MAIL E SENHA
   ========================================================= */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(email) {
    return EMAIL_REGEX.test(email.trim());
}

function setFieldState(inputEl, hintEl, state, message = '') {
    if (!inputEl) return;
    inputEl.classList.remove('field-valid', 'field-invalid');
    if (hintEl) {
        hintEl.classList.remove('error', 'success');
        hintEl.textContent = message;
    }
    if (state === 'valid') {
        inputEl.classList.add('field-valid');
        if (hintEl) hintEl.classList.add('success');
    } else if (state === 'invalid') {
        inputEl.classList.add('field-invalid');
        if (hintEl) hintEl.classList.add('error');
    }
}

function attachLiveEmailValidation(inputId, hintId) {
    const input = document.getElementById(inputId);
    const hint = document.getElementById(hintId);
    if (!input) return;

    input.addEventListener('blur', () => {
        if (!input.value) { setFieldState(input, hint, 'neutral'); return; }
        if (isValidEmail(input.value)) {
            setFieldState(input, hint, 'valid');
        } else {
            setFieldState(input, hint, 'invalid', 'Digite um e-mail válido (ex: nome@dominio.com).');
        }
    });

    input.addEventListener('input', () => {
        if (input.classList.contains('field-invalid') && isValidEmail(input.value)) {
            setFieldState(input, hint, 'valid');
        }
    });
}

attachLiveEmailValidation('loginEmail', 'loginEmailHint');
attachLiveEmailValidation('regEmail', 'regEmailHint');

/* Força da senha (feedback visual) */
function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
}

const regPasswordInput = document.getElementById('regPassword');
const strengthMeter = document.getElementById('strengthMeter');
const regPasswordHint = document.getElementById('regPasswordHint');

if (regPasswordInput && strengthMeter) {
    const strengthLabels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
    regPasswordInput.addEventListener('input', () => {
        const level = regPasswordInput.value ? calculatePasswordStrength(regPasswordInput.value) : 0;
        strengthMeter.setAttribute('data-level', level);
        if (regPasswordHint) {
            regPasswordHint.textContent = regPasswordInput.value
                ? `Força da senha: ${strengthLabels[level]}`
                : 'Use letras, números e um símbolo para uma senha forte.';
            regPasswordHint.classList.remove('error', 'success');
            if (level >= 3) regPasswordHint.classList.add('success');
        }
    });
}

/* Confirmação de senha em tempo real */
const regPasswordConfirmInput = document.getElementById('regPasswordConfirm');
const regPasswordConfirmHint = document.getElementById('regPasswordConfirmHint');

function checkPasswordsMatch() {
    if (!regPasswordConfirmInput || !regPasswordConfirmInput.value) {
        setFieldState(regPasswordConfirmInput, regPasswordConfirmHint, 'neutral');
        return;
    }
    if (regPasswordInput && regPasswordInput.value === regPasswordConfirmInput.value) {
        setFieldState(regPasswordConfirmInput, regPasswordConfirmHint, 'valid', 'As senhas coincidem.');
    } else {
        setFieldState(regPasswordConfirmInput, regPasswordConfirmHint, 'invalid', 'As senhas não coincidem.');
    }
}

if (regPasswordConfirmInput) {
    regPasswordConfirmInput.addEventListener('input', checkPasswordsMatch);
    regPasswordInput?.addEventListener('input', checkPasswordsMatch);
}

/* Mostrar/ocultar senha */
document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.getAttribute('data-target'));
        if (!target) return;
        const icon = btn.querySelector('i');
        const isHidden = target.type === 'password';
        target.type = isHidden ? 'text' : 'password';
        if (icon) {
            icon.classList.toggle('fa-eye', !isHidden);
            icon.classList.toggle('fa-eye-slash', isHidden);
        }
        btn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
    });
});

/* =========================================================
   ALTERNAR ENTRE ABAS
   ========================================================= */
function switchTab(tabName) {
    const forms = document.querySelectorAll('.auth-form');
    const buttons = document.querySelectorAll('.tab-btn');
    const tabsWrapper = document.getElementById('authTabs');

    forms.forEach(form => form.classList.remove('active'));

    if (tabName === 'login') {
        document.getElementById('loginForm')?.classList.add('active');
        buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === 'login'));
        tabsWrapper?.classList.remove('tab-register');
        document.getElementById('loginEmail')?.focus();
    } else if (tabName === 'register') {
        document.getElementById('registerForm')?.classList.add('active');
        buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === 'register'));
        tabsWrapper?.classList.add('tab-register');
        document.getElementById('regName')?.focus();
    } else if (tabName === 'forgot') {
        document.getElementById('forgotForm')?.classList.add('active');
        buttons.forEach(b => b.classList.remove('active'));
        document.getElementById('forgotEmail')?.focus();
    }
}

/* =========================================================
   ESTADO DE CARREGAMENTO NO BOTÃO
   ========================================================= */
function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
}

/* =========================================================
   LIMITE DE TENTATIVAS DE LOGIN
   ========================================================= */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

function getAttemptState(email) {
    const raw = localStorage.getItem(`nvpey_attempts_${email}`);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
}

function saveAttemptState(email, state) {
    localStorage.setItem(`nvpey_attempts_${email}`, JSON.stringify(state));
}

function registerFailedAttempt(email) {
    const state = getAttemptState(email);
    state.count += 1;
    if (state.count >= MAX_ATTEMPTS) {
        state.lockedUntil = Date.now() + LOCKOUT_MS;
        state.count = 0;
    }
    saveAttemptState(email, state);
    return state;
}

function clearAttempts(email) {
    localStorage.removeItem(`nvpey_attempts_${email}`);
}

/* =========================================================
   CADASTRO
   ========================================================= */
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const rawPass = document.getElementById('regPassword').value;
    const confirmPass = document.getElementById('regPasswordConfirm').value;
    const termsAccepted = document.getElementById('acceptTerms').checked;
    const submitBtn = document.getElementById('registerSubmitBtn');

    if (!name) {
        showToast('Informe seu nome completo.', 'error');
        return;
    }
    if (!isValidEmail(email)) {
        setFieldState(document.getElementById('regEmail'), document.getElementById('regEmailHint'), 'invalid', 'Digite um e-mail válido (ex: nome@dominio.com).');
        showToast('Digite um e-mail válido.', 'error');
        return;
    }
    if (rawPass.length < 6) {
        showToast('A senha precisa ter no mínimo 6 caracteres.', 'error');
        return;
    }
    if (rawPass !== confirmPass) {
        setFieldState(document.getElementById('regPasswordConfirm'), document.getElementById('regPasswordConfirmHint'), 'invalid', 'As senhas não coincidem.');
        showToast('As senhas digitadas não coincidem.', 'error');
        return;
    }
    if (!termsAccepted) {
        showToast('Você precisa aceitar os termos de uso para criar a conta.', 'error');
        return;
    }

    setButtonLoading(submitBtn, true);

    // Permite que o navegador renderize o estado de "loading" no botão antes do cálculo do hash
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');

        const userExists = users.some(u => u.email === email);
        if (userExists) {
            showToast('Este e-mail já possui uma conta cadastrada.', 'error');
            return;
        }

        const salt = generateSalt();
        const passwordHash = await hashPassword(rawPass, salt);

        users.push({ name, email, salt, passHash: passwordHash });
        localStorage.setItem('nvpey_users', JSON.stringify(users));

        showToast('Conta criada com sucesso! Faça login para continuar.', 'success');

        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = '';
        document.getElementById('regPasswordConfirm').value = '';
        document.getElementById('acceptTerms').checked = false;
        switchTab('login');
    } catch (err) {
        showToast('Não foi possível criar a conta agora. Tente novamente.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/* =========================================================
   LOGIN
   ========================================================= */
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const rawPass = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (!isValidEmail(email)) {
        setFieldState(document.getElementById('loginEmail'), document.getElementById('loginEmailHint'), 'invalid', 'Digite um e-mail válido.');
        showToast('Digite um e-mail válido.', 'error');
        return;
    }

    const attemptState = getAttemptState(email);
    if (attemptState.lockedUntil > Date.now()) {
        const secondsLeft = Math.ceil((attemptState.lockedUntil - Date.now()) / 1000);
        showToast(`Muitas tentativas. Aguarde ${secondsLeft}s antes de tentar novamente.`, 'error');
        return;
    }

    setButtonLoading(submitBtn, true);

    // Permite que o navegador renderize o estado de "loading" no botão antes do cálculo do hash
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const users = JSON.parse(localStorage.getItem('nvpey_users') || '[]');
        const user = users.find(u => u.email === email);

        if (!user) {
            showToast('Conta não encontrada. Crie uma conta na aba "Criar Conta".', 'error');
            return;
        }

        const inputHash = await hashPassword(rawPass, user.salt);

        if (inputHash === user.passHash) {
            clearAttempts(email);
            localStorage.setItem('nvpey_logged_user', JSON.stringify({
                name: user.name,
                email: user.email
            }));
            showToast('Acesso liberado! Redirecionando...', 'success', 1200);
            setTimeout(() => { window.location.href = 'anotacoes.html'; }, 700);
        } else {
            const state = registerFailedAttempt(email);
            if (state.lockedUntil > Date.now()) {
                showToast(`Muitas tentativas incorretas. Acesso bloqueado por 30 segundos.`, 'error');
            } else {
                const remaining = MAX_ATTEMPTS - state.count;
                showToast(`Senha incorreta. Você tem mais ${remaining} tentativa(s).`, 'error');
            }
        }
    } catch (err) {
        showToast('Não foi possível acessar agora. Tente novamente.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

/* =========================================================
   ESQUECI A SENHA
   ========================================================= */
function handleForgot(event) {
    event.preventDefault();

    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    const submitBtn = document.getElementById('forgotSubmitBtn');

    if (!isValidEmail(email)) {
        showToast('Digite um e-mail válido.', 'error');
        return;
    }

    setButtonLoading(submitBtn, true);

    setTimeout(() => {
        showToast('Se este e-mail estiver cadastrado, as instruções de recuperação seriam enviadas para ele.', 'info', 5500);
        setButtonLoading(submitBtn, false);
        event.target.reset();
    }, 500);
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginEmail')?.focus();
});