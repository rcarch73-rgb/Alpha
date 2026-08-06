(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const signInBtn = document.getElementById('signInBtn');
  const statusEl = document.getElementById('status');

  const maxChecks = 40;
  const checkDelayMs = 25;

  let client = null;

  function setPending(pending) {
    document.documentElement.classList.toggle('hn-auth-pending', pending);
  }

  function appHref() {
    const url = new URL('../app/', window.location.href);
    url.search = window.location.search;
    url.hash = window.location.hash;
    return url.href;
  }

  function waitForSharedClient() {
    return new Promise((resolve) => {
      let checks = 0;

      function check() {
        if (window.HNSupabaseClient && window.HNSupabaseClient.client) {
          resolve(window.HNSupabaseClient.client);
          return;
        }

        checks += 1;
        if (checks >= maxChecks) {
          resolve(null);
          return;
        }

        setTimeout(check, checkDelayMs);
      }

      check();
    });
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = type || '';
  }

  function isValidEmail(value) {
    return /^\S+@\S+\.\S+$/.test(value);
  }

  async function onSubmit(event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!isValidEmail(email)) {
      setStatus('Enter a valid email address.', 'error');
      return;
    }

    if (!password) {
      setStatus('Enter your password.', 'error');
      return;
    }

    if (!client) {
      setStatus('Account service is currently unavailable. Please try again shortly.', 'error');
      return;
    }

    signInBtn.disabled = true;
    setStatus('Signing in...', '');

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    signInBtn.disabled = false;

    if (error) {
      if (/invalid login credentials|invalid email or password/i.test(error.message || '')) {
        setStatus('Invalid email or password.', 'error');
      } else {
        setStatus(error.message || 'Unable to sign in right now.', 'error');
      }
      return;
    }

    setStatus('Login successful.', 'success');
    if (data && data.session) {
      window.location.replace(appHref());
      return;
    }

    form.reset();
  }

  async function initialize() {
    setPending(true);

    try {
      client = await waitForSharedClient();

      if (client && client.auth && typeof client.auth.getSession === 'function') {
        const { data } = await client.auth.getSession();
        if (data && data.session) {
          window.location.replace(appHref());
          return;
        }
      }
    } catch (_error) {
      // Intentionally reveal sign-in UI on check failure.
    }

    setPending(false);
  }

  if (form) {
    form.addEventListener('submit', onSubmit);
  }

  initialize();
})();