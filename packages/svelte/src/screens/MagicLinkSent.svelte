<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  Waits for an emailed link to be used, then signs this tab in. A link opened in
  another tab of this browser reports back at once; one opened on another device
  is picked up by polling.
-->
<script lang="ts">
  import { MAGIC_LINK_RESEND_COOLDOWN_SECONDS, watchMagicLink } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  const identifier = navigator.state().identifier as string | undefined;
  let cooldown = $state(MAGIC_LINK_RESEND_COOLDOWN_SECONDS);

  // Browser only: a server render must not poll or open a channel.
  onMount(() => {
    const timer = setInterval(() => {
      cooldown = Math.max(0, cooldown - 1);
    }, 1000);

    const stop = watchMagicLink({
      client: auth.client,
      refreshSession: auth.refreshSession,
      onSignedIn: () => void navigator.toApp(),
    });

    return () => {
      clearInterval(timer);
      stop();
    };
  });

  async function resend() {
    if (cooldown > 0) return;
    await auth.client.requestMagicLink();
    cooldown = MAGIC_LINK_RESEND_COOLDOWN_SECONDS;
  }
</script>

<AuthLayout>
  <div class="sa-center">
    <h2 class="sa-heading">Check your email</h2>
    <p class="sa-description">
      If an account exists for this address, we sent a secure sign-in link.
    </p>
    {#if identifier}
      <div class="sa-identifier">{identifier}</div>
    {/if}
    <p class="sa-helper-text">Open the email and click the link to finish signing in.</p>
    <p class="sa-helper-text">
      Didn't receive anything? Check your spam folder or try creating a new account.
    </p>
  </div>

  <div class="sa-actions">
    <button type="button" class="sa-secondary" disabled={cooldown > 0} onclick={resend}>
      Resend link
    </button>
    {#if cooldown > 0}
      <div class="sa-helper-text sa-center">Available in {cooldown}s</div>
    {/if}
    <button type="button" class="sa-link" onclick={() => navigator.toScreen('login')}>
      Change email or phone
    </button>
  </div>
</AuthLayout>
