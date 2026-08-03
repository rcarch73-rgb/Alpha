(function () {
  'use strict';

  const projectUrl = 'https://hztzyenhnbbyisokqqgj.supabase.co';
  const publishableKey = 'sb_publishable_vsHcfFEuI7Nfic15vxdZrg_dj0QM49A';

  const hasSupabaseLibrary =
    typeof window !== 'undefined' &&
    window.supabase &&
    typeof window.supabase.createClient === 'function';

  let client = null;
  let isAvailable = false;

  if (hasSupabaseLibrary) {
    try {
      client = window.supabase.createClient(projectUrl, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      isAvailable = !!client;
    } catch (error) {
      client = null;
      isAvailable = false;
      console.warn('Harbour North Supabase client is unavailable.', error);
    }
  } else {
    console.warn('Harbour North Supabase client is unavailable.');
  }

  window.HNSupabaseClient = {
    client,
    isAvailable,
    projectUrl
  };
})();