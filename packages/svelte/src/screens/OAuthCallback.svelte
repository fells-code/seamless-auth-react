<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!-- The OAuth redirect URI. Finishes a provider sign-in. -->
<script module lang="ts">
  // Codes this page has already spent. A code can be exchanged once, and a screen
  // that mounts again must not send it a second time.
  const spent = new Set<string>();
</script>

<script lang="ts">
  import { completeOAuthCallback } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  let error = $state('');

  // Browser only: the code is single use, and a server render has neither the
  // browser's cookies nor a window.
  onMount(() => {
    void (async () => {
      const params = new URLSearchParams();
      for (const name of ['code', 'state']) {
        const value = navigator.query(name);
        if (value !== null) params.set(name, value);
      }

      const code = params.get('code');
      if (code !== null && spent.has(code)) {
        error = 'This sign-in link has already been used.';
        return;
      }
      if (code !== null) spent.add(code);

      // The code and state are read; keep them out of history and Referers.
      void navigator.dropQuery().catch(() => undefined);

      const outcome = await completeOAuthCallback(auth, params, window.location.origin);

      if (outcome.kind === 'error') {
        error = outcome.message;
        return;
      }

      if (outcome.kind === 'enroll_passkey') {
        await navigator.toScreen('registerPasskey', { returnTo: outcome.returnTo });
        return;
      }

      await navigator.toLocation(outcome.destination);
    })();
  });
</script>

<AuthLayout card={false}>
  <h2 class="sa-heading">{error ? 'Sign-in failed' : 'Completing sign-in...'}</h2>
  {#if error}
    <p>{error}</p>
    <button type="button" class="sa-link" onclick={() => navigator.toScreen('login')}>
      Back to login
    </button>
  {/if}
</AuthLayout>
