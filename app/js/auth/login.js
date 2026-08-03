(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const signInBtn = document.getElementById('signInBtn');
  const statusEl = document.getElementById('status');

  const client = window.HNSupabaseClient && window.HNSupabaseClient.client;

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
      window.location.replace(
        new URL('../../app/', window.location.href).href
      );
      return;
    }

    form.reset();
  }

  form.addEventListener('submit', onSubmit);
})();