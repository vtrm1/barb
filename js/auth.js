// auth.js concentra funcionalidades de autenticação compartilhadas entre login e admin.

/**
 * Realiza login a partir do formulário em login.html
 */
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const errorBox = document.getElementById('login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      errorBox.classList.add('hidden');
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'admin.html';
    } catch (error) {
      errorBox.textContent = traduzErroAuth(error.code);
      errorBox.classList.remove('hidden');
    }
  });
}

/**
 * Aplica proteção simples: se não houver usuário autenticado, redireciona para login.
 */
function protectAdminPage() {
  const logoutBtn = document.getElementById('logout-btn');

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'login.html';
      });
    }
  });
}

/**
 * Traduz erros comuns do Firebase Auth para mensagens amigáveis.
 */
function traduzErroAuth(code) {
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Usuário desativado.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
  };
  return map[code] || 'Falha ao entrar. Verifique seus dados.';
}

// Inicializações específicas por página
initLoginForm();
protectAdminPage();
