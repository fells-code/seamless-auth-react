<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!-- Sign in with a passkey alone, without an identifier first. -->
<script lang="ts">
  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  let error = $state('');

  async function signIn() {
    error = '';
    const result = await auth.handlePasskeyLogin();

    if (result.error) {
      error = 'Passkey sign-in could not be completed. Try another sign-in method.';
      return;
    }

    await navigator.toApp();
  }
</script>

<AuthLayout>
  <h2 class="sa-heading">Login with Passkey</h2>
  <button type="button" class="sa-button" onclick={signIn}>Use Passkey</button>
  {#if error}
    <p class="sa-error">{error}</p>
  {/if}
</AuthLayout>
