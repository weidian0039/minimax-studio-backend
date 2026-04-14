/**
 * MiniMax Studio — Auth Page Logic
 * Manages login/register toggle, validation, and API calls.
 */
(function() {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let currentMode = 'login'; // 'login' | 'register'

  // ── Elements ──────────────────────────────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const formErrorSummary = document.getElementById('formErrorSummary');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authToggle = document.getElementById('authToggle');
  const toggleText = document.getElementById('toggleText');
  const toggleLink = document.getElementById('toggleLink');
  const forgotMessage = document.getElementById('forgotMessage');
  const forgotLink = document.getElementById('forgotLink');
  const forgotBackBtn = document.getElementById('forgotBackBtn');

  // ── Redirect if already logged in ─────────────────────────────────────────
  const token = localStorage.getItem('mock_auth_token');
  if (token) {
    window.location.href = 'dashboard.html';
    return;
  }

  // ── Validation Helpers ────────────────────────────────────────────────────
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + '-error');
    if (input) input.setAttribute('aria-invalid', 'true');
    if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
  }

  function clearFieldError(inputId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + '-error');
    if (input) input.removeAttribute('aria-invalid');
    if (errorEl) { errorEl.textContent = ''; errorEl.hidden = true; }
  }

  function showFormError(message) {
    formErrorSummary.textContent = message;
    formErrorSummary.hidden = false;
  }

  function clearFormError() {
    formErrorSummary.textContent = '';
    formErrorSummary.hidden = true;
  }

  // ── Password Strength ──────────────────────────────────────────────────────
  const strengthFill = document.getElementById('strengthFill');
  const strengthLabel = document.getElementById('strengthLabel');
  const passwordStrength = document.getElementById('passwordStrength');
  const regPassword = document.getElementById('regPassword');

  function calcStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0-4
  }

  const strengthLabels = ['', 'Weak 弱', 'Fair 一般', 'Good 良好', 'Strong 强'];

  if (regPassword && strengthFill && strengthLabel) {
    regPassword.addEventListener('input', function() {
      const pwd = this.value;
      if (!pwd) {
        passwordStrength.hidden = true;
        return;
      }
      passwordStrength.hidden = false;
      const score = calcStrength(pwd);
      strengthFill.className = 'strength-fill' + (score > 0 ? ` level-${score}` : '');
      strengthLabel.textContent = strengthLabels[score] || '';
    });
  }

  // ── Password Show/Hide ─────────────────────────────────────────────────────
  function setupPasswordToggle(toggleBtn, inputId, eyeIconId) {
    if (!toggleBtn) return;
    toggleBtn.addEventListener('click', function() {
      const input = document.getElementById(inputId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const eye = document.getElementById(eyeIconId);
      if (eye) eye.innerHTML = isPassword ? '&#128064;' : '&#128065;';
      toggleBtn.setAttribute('aria-label', isPassword ? '隐藏密码 Hide password' : '显示密码 Show password');
    });
  }

  setupPasswordToggle(document.getElementById('loginPasswordToggle'), 'loginPassword', 'loginEyeIcon');
  setupPasswordToggle(document.getElementById('regPasswordToggle'), 'regPassword', 'regEyeIcon');
  setupPasswordToggle(document.getElementById('regConfirmToggle'), 'regConfirmPassword', 'regConfirmEyeIcon');

  // ── Tab Switching ──────────────────────────────────────────────────────────
  function switchToLogin() {
    currentMode = 'login';
    loginForm.hidden = false;
    registerForm.hidden = true;
    forgotMessage.hidden = true;
    authToggle.hidden = false;
    authTitle.textContent = '登录 Login';
    authSubtitle.textContent = '欢迎回来！请登录你的账户 Welcome back!';
    toggleText.textContent = '还没有账号? ';
    toggleLink.textContent = '注册 Create account';
    toggleLink.href = '#';
    clearFormError();
  }

  function switchToRegister() {
    currentMode = 'register';
    loginForm.hidden = true;
    registerForm.hidden = false;
    forgotMessage.hidden = true;
    authToggle.hidden = false;
    authTitle.textContent = '注册 Register';
    authSubtitle.textContent = '创建你的 MiniMax Studio 账户 Create your account';
    toggleText.textContent = '已有账号? ';
    toggleLink.textContent = '登录 Login';
    toggleLink.href = '#';
    clearFormError();
  }

  toggleLink.addEventListener('click', function(e) {
    e.preventDefault();
    if (currentMode === 'login') switchToRegister();
    else switchToLogin();
  });

  // ── Forgot Password ───────────────────────────────────────────────────────
  if (forgotLink) {
    forgotLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.hidden = true;
      registerForm.hidden = true;
      authToggle.hidden = true;
      forgotMessage.hidden = false;
      authTitle.textContent = '重置密码 Reset Password';
      authSubtitle.textContent = '我们会尽快推出此功能 This feature is coming soon';
      clearFormError();
    });
  }

  if (forgotBackBtn) {
    forgotBackBtn.addEventListener('click', switchToLogin);
  }

  // ── Clear errors on focus ──────────────────────────────────────────────────
  document.querySelectorAll('input').forEach(function(input) {
    input.addEventListener('focus', function() {
      const id = this.id;
      if (id) clearFieldError(id);
      clearFormError();
    });
  });

  // ── Login Submit ───────────────────────────────────────────────────────────
  const loginBtn = document.getElementById('loginBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      clearFormError();

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      // Client-side validation
      let hasError = false;
      if (!email || !isValidEmail(email)) {
        showFieldError('loginEmail', '请输入有效的邮箱地址');
        hasError = true;
      }
      if (!password) {
        showFieldError('loginPassword', '请输入密码');
        hasError = true;
      }
      if (hasError) return;

      // Loading state
      loginBtn.disabled = true;
      loginBtn.classList.add('loading');
      loginBtn.textContent = '处理中...';

      try {
        const data = await window.API.auth.login(email, password);
        // Redirect to dashboard on success
        window.location.href = 'dashboard.html';
      } catch (err) {
        const msg = err.message || '登录失败，请检查邮箱和密码';
        showFormError(msg);
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.textContent = '登录 Login';
      }
    });
  }

  // ── Register Submit ────────────────────────────────────────────────────────
  const registerBtn = document.getElementById('registerBtn');

  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      clearFormError();

      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirm = document.getElementById('regConfirmPassword').value;

      let hasError = false;
      if (!email || !isValidEmail(email)) {
        showFieldError('regEmail', '请输入有效的邮箱地址');
        hasError = true;
      }
      if (!password || password.length < 8) {
        showFieldError('regPassword', '密码至少需要 8 个字符');
        hasError = true;
      }
      if (password !== confirm) {
        showFieldError('regConfirmPassword', '两次输入的密码不一致');
        hasError = true;
      }
      if (hasError) return;

      // Loading state
      registerBtn.disabled = true;
      registerBtn.classList.add('loading');
      registerBtn.textContent = '处理中...';

      try {
        await window.API.auth.register(email, password);
        // Redirect to dashboard on success
        window.location.href = 'dashboard.html';
      } catch (err) {
        let msg = err.message || '注册失败，请稍后重试';
        if (err.errorCode === 'duplicate_email') {
          msg = '该邮箱已被注册，请尝试登录或使用其他邮箱';
          showFieldError('regEmail', msg);
        } else {
          showFormError(msg);
        }
        registerBtn.disabled = false;
        registerBtn.classList.remove('loading');
        registerBtn.textContent = '注册 Create Account';
      }
    });
  }
})();
