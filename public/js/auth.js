function showMessage(message, isError = false) {
  const banner = document.getElementById('auth-message');
  banner.textContent = message;
  banner.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border-red-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
  if (isError) {
    banner.classList.add('bg-red-50', 'text-red-700', 'border-red-200');
  } else {
    banner.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
  }
}

function switchTab(tab) {
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  const activeClasses = ['bg-white', 'text-slate-900', 'shadow-sm'];
  const inactiveClasses = ['text-slate-600'];

  if (tab === 'login') {
    loginTab.classList.add(...activeClasses);
    loginTab.classList.remove(...inactiveClasses);
    registerTab.classList.remove(...activeClasses);
    registerTab.classList.add(...inactiveClasses);
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    registerTab.classList.add(...activeClasses);
    registerTab.classList.remove(...inactiveClasses);
    loginTab.classList.remove(...activeClasses);
    loginTab.classList.add(...inactiveClasses);
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const email = form.email.value.trim();
    const password = form.password.value;
    const result = await api.login({ email, password });
    api.setToken(result.data.token);
    api.setUser(result.data.user);
    window.location.href = '/dashboard.html';
  } catch (err) {
    showMessage(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const result = await api.register({ name, email, password });
    api.setToken(result.data.token);
    api.setUser(result.data.user);
    window.location.href = '/dashboard.html';
  } catch (err) {
    showMessage(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (api.getToken()) {
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
});
