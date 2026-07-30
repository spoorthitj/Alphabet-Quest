import { initializeAuth, signInWithEmail, signUpWithEmail } from './auth.js';
import { writeSession, clearSession, readSession } from './session.js';

const SESSION_KEY = 'aq_session';

function clearErrors() {
  ['loginError', 'regError'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.classList.remove('visible');
    }
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.classList.add('visible');
  }
}

function setBubble(text) {
  const el = document.getElementById('bubbleText');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = text;
    el.style.opacity = '1';
  }, 200);
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');

  if (loginTab) loginTab.classList.toggle('active', isLogin);
  if (registerTab) registerTab.classList.toggle('active', !isLogin);
  if (loginPanel) loginPanel.classList.toggle('active', isLogin);
  if (registerPanel) registerPanel.classList.toggle('active', !isLogin);
  clearErrors();
  const msgs = {
    login: "Welcome back! I've been waiting for you! 🎉",
    register: "Ooh, a new adventurer! Hoot loves new friends! 🦉"
  };
  setBubble(msgs[tab]);
}

function showWelcomeFlash(name, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-box">
      <div class="welcome-emoji">🎉</div>
      <h2>Welcome back, ${name}!</h2>
      <p>Let's jump back into Alphabet Quest.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.remove();
      callback();
    }, 600);
  }, 1000);
}

function validateEmail(email) {
  const value = (email || '').trim();
  if (!value) return 'Please enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
  return null;
}

function validatePassword(password) {
  if (!password) return 'Please enter a password.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

function validateUsername(name) {
  const value = (name || '').trim();
  if (!value) return 'Please enter a username.';
  if (value.length < 2) return 'Username must be at least 2 characters.';
  return null;
}

window.switchTab = switchTab;

window.handleLogin = async function handleLogin(e) {
  if (e?.preventDefault) e.preventDefault();
  clearErrors();
  const emailEl = document.getElementById('loginEmail');
  const passwordEl = document.getElementById('loginPassword');
  const email = emailEl ? emailEl.value : '';
  const password = passwordEl ? passwordEl.value : '';

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  if (emailError) return showError('loginError', emailError);
  if (passwordError) return showError('loginError', passwordError);

  const user = await signInWithEmail(email, password, {
    onSuccess: (sessionUser) => {
      const profileName = sessionUser.email?.split('@')[0] || 'Adventurer';
      writeSession(sessionUser, { username: profileName });
      showWelcomeFlash(profileName, () => window.location.replace('index.html'));
    },
    onError: (message) => showError('loginError', message)
  });

  if (!user) return;
};

window.handleRegister = async function handleRegister(e) {
  if (e?.preventDefault) e.preventDefault();
  clearErrors();
  const usernameEl = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const passwordEl = document.getElementById('regPassword');

  const username = usernameEl ? usernameEl.value : '';
  const email = emailEl ? emailEl.value : '';
  const password = passwordEl ? passwordEl.value : '';

  const usernameError = validateUsername(username);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  if (usernameError) return showError('regError', usernameError);
  if (emailError) return showError('regError', emailError);
  if (passwordError) return showError('regError', passwordError);

  const user = await signUpWithEmail(email, password, username, {
    onSuccess: (sessionUser) => {
      writeSession(sessionUser, { username });
      showWelcomeFlash(username, () => window.location.replace('index.html'));
    },
    onError: (message) => showError('regError', message)
  });

  if (!user) return;
};

function bindEvents() {
  document.getElementById('loginBtn')?.addEventListener('click', window.handleLogin);
  document.getElementById('registerBtn')?.addEventListener('click', window.handleRegister);
  document.getElementById('loginTab')?.addEventListener('click', () => switchTab('login'));
  document.getElementById('registerTab')?.addEventListener('click', () => switchTab('register'));

  document.getElementById('loginEmail')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.handleLogin(e);
  });
  document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.handleLogin(e);
  });
  document.getElementById('regPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.handleRegister(e);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindEvents);
} else {
  bindEvents();
}

(async function initLoginPage() {
  const currentSession = readSession();

  const authState = await initializeAuth({
    onSessionReady: (user) => {
      const username = currentSession?.name || user?.email?.split('@')[0] || 'Adventurer';
      writeSession(user, { username });
      showWelcomeFlash(username, () => window.location.replace('index.html'));
    },
    onError: () => {}
  });

  if (!authState.ready) {
    if (currentSession?.userId) {
      clearSession();
    }
    const msgs = [
      "Hey there! Ready to go on an alphabet adventure? 🌟",
      "Squibb loves learning letters! Let's go! 🐱",
      "Hoot knows all 26 letters by heart! 📚",
      "Join us — it's going to be SO much fun! 🎈"
    ];
    let msgIdx = 0;
    setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      if (!document.querySelector('.tab-btn.active')?.id.includes('register')) {
        setBubble(msgs[msgIdx]);
      }
    }, 3500);
  }
})();

