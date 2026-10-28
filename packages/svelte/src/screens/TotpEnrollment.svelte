<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  Adds an authenticator app to the signed-in account: a QR code and setup key
  to add it, then its first code to prove it works.
-->
<script lang="ts">
  import {
    formatTotpSecret,
    qrCode,
    TOTP_CODE_LENGTH,
    totpErrorMessage,
    type TotpEnrollmentStartResult,
  } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getSeamlessAuth } from '../context.js';
  import OtpInput from './OtpInput.svelte';

  let { onEnrolled }: { onEnrolled: () => void | Promise<void> } = $props();

  const auth = getSeamlessAuth();

  let enrollment = $state.raw<TotpEnrollmentStartResult | null>(null);
  let starting = $state(true);
  let startError = $state('');
  let code = $state('');
  let error = $state('');
  let verifying = $state(false);
  let copyMessage = $state('');

  const qr = $derived(enrollment ? qrCode(enrollment.otpauthUrl) : null);
  // The URL comes from the server, so only an otpauth: one becomes a link.
  const appLink = $derived(
    enrollment?.otpauthUrl.startsWith('otpauth://') ? enrollment.otpauthUrl : null
  );

  onMount(() => {
    void start();
  });

  async function start() {
    starting = true;
    startError = '';

    const { data, error: failure } = await auth.client.startTotpEnrollment();

    starting = false;
    if (failure) {
      startError = totpErrorMessage(failure, 'Could not start setting up an authenticator app.');
      return;
    }

    enrollment = data;
  }

  async function copySecret() {
    if (!enrollment) return;

    try {
      await globalThis.navigator.clipboard.writeText(enrollment.secret);
      copyMessage = 'Setup key copied.';
    } catch {
      copyMessage = 'Could not copy. Select the key and copy it instead.';
    }
  }

  async function verify(event: SubmitEvent) {
    event.preventDefault();
    if (verifying) return;
    error = '';

    if (code.length !== TOTP_CODE_LENGTH) {
      error = `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`;
      return;
    }

    verifying = true;

    try {
      const { error: failure } = await auth.client.verifyTotpEnrollment(code);

      if (failure) {
        error = totpErrorMessage(failure, 'That code could not be verified.');
        code = '';
        return;
      }

      await auth.refreshSession();
      await onEnrolled();
    } finally {
      verifying = false;
    }
  }
</script>

{#if starting}
  <div class="sa-center">
    <div class="sa-spinner" aria-hidden="true"></div>
    <span>Preparing your authenticator app...</span>
  </div>
{:else if !enrollment || !qr}
  <p class="sa-error" role="alert">{startError}</p>
  <button type="button" class="sa-secondary" onclick={start}>Try again</button>
{:else}
  <p class="sa-description">
    Scan this QR code with your authenticator app, or enter the setup key by hand.
  </p>
  <div class="sa-center">
    <svg
      role="img"
      aria-label="QR code for your authenticator app"
      width="192"
      height="192"
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      shape-rendering="crispEdges"
    >
      <rect width={qr.size} height={qr.size} fill="#ffffff" />
      <path d={qr.path} fill="#000000" />
    </svg>
  </div>

  <span class="sa-label">Setup key</span>
  <p class="sa-identifier"><code>{formatTotpSecret(enrollment.secret)}</code></p>
  <button type="button" class="sa-secondary" onclick={copySecret}>Copy setup key</button>
  {#if copyMessage}
    <p class="sa-helper-text" role="status">{copyMessage}</p>
  {/if}
  {#if appLink}
    <p class="sa-helper-text">
      <a class="sa-link" href={appLink}>Open in an authenticator app on this device</a>
    </p>
  {/if}

  <form onsubmit={verify}>
    <span class="sa-label">Enter the code your authenticator app shows</span>
    <OtpInput bind:value={code} length={TOTP_CODE_LENGTH} mode="numeric" name="totp" />
    {#if error}
      <p class="sa-error" role="alert">{error}</p>
    {/if}
    <button type="submit" class="sa-button" disabled={verifying}>
      {verifying ? 'Verifying...' : 'Verify code'}
    </button>
  </form>
{/if}
