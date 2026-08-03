(function () {
  'use strict';

  const loginHref = new URL('../auth/login.html', window.location.href).href;
  const maxChecks = 40;
  const checkDelayMs = 25;

  function redirectToLogin() {
    window.location.replace(loginHref);
  }

  function waitForSharedClient() {
    return new Promise((resolve) => {
      let checks = 0;

      function check() {
        if (window.HNSupabaseClient) {
          resolve(window.HNSupabaseClient);
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

  async function enforceSession() {
    try {
      const shared = await waitForSharedClient();
      const client = shared && shared.client;

      if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
        redirectToLogin();
        return;
      }

      const { data } = await client.auth.getSession();
      if (!data || !data.session) {
        redirectToLogin();
      }
    } catch (_error) {
      redirectToLogin();
    }
  }

  enforceSession();
})();