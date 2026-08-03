(function () {
  'use strict';

  const form = document.getElementById('signupForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const createAccountBtn = document.getElementById('createAccountBtn');
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

    if (password.length < 8) {
      setStatus('Use at least 8 characters for your password.', 'error');
      return;
    }

    if (!client) {
      setStatus('Account service is currently unavailable. Please try again shortly.', 'error');
      return;
    }

    createAccountBtn.disabled = true;
    setStatus('Creating account...', '');

    const { data, error } = await client.auth.signUp({
      email,
      password
    });

    createAccountBtn.disabled = false;

    if (error) {
      if (/already registered/i.test(error.message || '')) {
        setStatus('An account with this email already exists. Try signing in or resetting your password.', 'error');
      } else {
        setStatus(error.message || 'Unable to create account right now.', 'error');
      }
      return;
    }

    if (data && data.session) {
      setStatus('If an account can be created with that email, check your inbox for a confirmation link.', 'success');
      form.reset();
      return;
    }

    setStatus('If an account can be created with that email, check your inbox for a confirmation link.', 'success');
    form.reset();
  }

  form.addEventListener('submit', onSubmit);
})();