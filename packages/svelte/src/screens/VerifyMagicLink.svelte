<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  Where an emailed magic link lands. Verifies the link once, tells the tab that
  asked for it, and signs this tab in too when the link was opened in the same
  browser.
-->
<script lang="ts">
  import { finishMagicLinkSignIn, type MagicLinkOutcome } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  let outcome = $state<MagicLinkOutcome | null>(null);
  let error = $state('');

  // Browser only. A server render would spend the single-use link in a request
  // that carries none of this browser's cookies.
  onMount(() => {
    let active = true;
    let redirect: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const token = navigator.query('token');

      if (!token) {
        error = 'Missing token for verification.';
        return;
      }

      // The token is read; keep it out of history and Referers from here on.
      void navigator.dropQuery();

      // A link can be used once, and a mounted screen verifies it once.
      const result = await auth.client.verifyMagicLink(token);

      if (!active) return;

      if (result.error) {
        error = 'Failed to verify token';
        return;
      }

      const next = await finishMagicLinkSignIn({
        client: auth.client,
        refreshSession: auth.refreshSession,
      });

      if (!active) return;

      outcome = next;

      if (next === 'signed-in') {
        redirect = setTimeout(() => void navigator.toApp(), 900);
      }
    })();

    return () => {
      active = false;
      clearTimeout(redirect);
    };
  });
</script>

<AuthLayout>
  <div class="sa-center">
    <h1 class="sa-heading">Verifying your login</h1>

    {#if !outcome && !error}
      <div class="sa-spinner" aria-hidden="true"></div>
      <p class="sa-helper-text">Please wait while we securely verify your sign-in link.</p>
    {/if}
    {#if outcome === 'signed-in'}
      <p class="sa-success" role="status">Login verified. Redirecting...</p>
    {/if}
    {#if outcome === 'elsewhere'}
      <p class="sa-success" role="status">
        Login verified. Return to the device where you requested this link to continue.
      </p>
    {/if}
    {#if error}
      <p class="sa-error" role="alert">{error}</p>
    {/if}
  </div>
</AuthLayout>
