<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  Offers passkey enrolment to a user who has just signed in. The session already
  exists by the time this renders, so a passkey is an addition to it, which is
  what makes leaving without one a legitimate way to finish.
-->
<script lang="ts">
  import {
    enrollPasskey,
    hasNonPasskeyLoginMethod,
    safeReturnPath,
    type PasskeyAttachment,
  } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  // The OAuth callback hands over the caller's destination when the API asks for
  // enrolment first. Without one, the configured signedInPath applies.
  const returnTo = navigator.state().returnTo;
  const finish = () =>
    returnTo === undefined ? navigator.toApp() : navigator.toLocation(safeReturnPath(returnTo));

  let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
  let message = $state('');

  // With passkey as the only enabled method, a user who skipped would have no
  // way back into the account they just made.
  const canSkip = $derived(hasNonPasskeyLoginMethod(auth.loginMethods));
  const busy = $derived(status === 'loading');

  onMount(() => {
    void auth.checkPasskeySupport();
    void auth.loadLoginMethods();
  });

  async function register(attachment?: PasskeyAttachment) {
    status = 'loading';

    const { error } = await enrollPasskey(
      { client: auth.client, refreshSession: auth.refreshSession },
      attachment
    );

    if (error) {
      status = 'error';
      message = error;
      return;
    }

    status = 'success';
    message = 'Passkey registered successfully.';
    await finish();
  }

  async function finishWithoutPasskey() {
    await auth.refreshSession();
    await finish();
  }
</script>

<AuthLayout>
  {#if auth.passkeySupportLoading || auth.loginMethodsLoading}
    <div class="sa-center">
      <div class="sa-spinner" aria-hidden="true"></div>
      <span>Checking for Passkey Support...</span>
    </div>
  {:else if !auth.passkeySupported}
    <h2 class="sa-heading">Passkeys are not available here</h2>
    <p class="sa-description">
      {canSkip
        ? 'This device does not support passkeys. You can continue without one and add a passkey later from a device that does.'
        : 'This device does not support passkeys, and this application requires one to sign in. Try again from a device or browser that supports them.'}
    </p>
    {#if canSkip}
      <button type="button" class="sa-button" onclick={finishWithoutPasskey}>Continue</button>
    {/if}
  {:else}
    <h2 class="sa-heading">Secure Your Account with a Passkey</h2>
    <p class="sa-description">
      Your device supports passkeys! Register one to skip passwords forever.
    </p>
    <button type="button" class="sa-button" disabled={busy} onclick={() => register()}>
      {busy ? 'Registering...' : 'Register Passkey'}
    </button>
    <button
      type="button"
      class="sa-secondary"
      disabled={busy}
      onclick={() => register('cross-platform')}
    >
      Use a security key instead
    </button>
    {#if message}
      <p class={status === 'success' ? 'sa-success' : 'sa-error'} role="status">{message}</p>
    {/if}
    {#if canSkip}
      <button type="button" class="sa-link" disabled={busy} onclick={finishWithoutPasskey}>
        Skip for now
      </button>
    {/if}
  {/if}
</AuthLayout>
