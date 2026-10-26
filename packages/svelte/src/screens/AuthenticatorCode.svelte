<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!-- Signs in with a code from an authenticator app, on the sign-in the login screen started. -->
<script lang="ts">
  import { signInWithTotp, TOTP_CODE_LENGTH } from '@seamless-auth/client';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';
  import OtpInput from './OtpInput.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();

  let code = $state('');
  let error = $state('');
  let loading = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (loading) return;
    error = '';
    loading = true;

    try {
      const result = await signInWithTotp(
        { client: auth.client, refreshSession: auth.refreshSession },
        code
      );

      if (result.error !== null) {
        error = result.error;
        code = '';
        return;
      }

      await navigator.toApp();
    } catch {
      // Backstop for unexpected errors only.
      error = 'Verification failed.';
    } finally {
      loading = false;
    }
  }
</script>

<AuthLayout>
  <h2 class="sa-heading">Enter your authenticator code</h2>
  <p class="sa-subtitle">Open your authenticator app and enter the code it shows for this account.</p>

  {#if error}
    <p class="sa-error" role="alert">{error}</p>
  {/if}

  <form onsubmit={submit}>
    <div>
      <span class="sa-label">Authenticator Code</span>
      <OtpInput bind:value={code} length={TOTP_CODE_LENGTH} mode="numeric" name="totp" />
    </div>

    <button type="submit" class="sa-button" disabled={loading}>
      {loading ? 'Verifying...' : 'Verify & Continue'}
    </button>

    <button type="button" class="sa-link" onclick={() => navigator.toScreen('login')}>
      Back to login
    </button>
  </form>
</AuthLayout>
