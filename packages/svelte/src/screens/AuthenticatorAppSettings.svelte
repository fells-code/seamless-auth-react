<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  The signed-in user's authenticator app: whether one is set up, adding one,
  and turning it off. Router-free, so it sits on any settings page.
-->
<script lang="ts">
  import { TOTP_CODE_LENGTH, totpErrorMessage, type TotpStatus } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';
  import OtpInput from './OtpInput.svelte';
  import TotpEnrollment from './TotpEnrollment.svelte';

  const auth = getSeamlessAuth();

  let status = $state.raw<TotpStatus | null>(null);
  let loadError = $state('');
  let mode = $state<'view' | 'enroll' | 'disable'>('view');
  let notice = $state('');
  let code = $state('');
  let error = $state('');
  let busy = $state(false);

  const formatDate = (value: string) => new Date(value).toLocaleDateString();

  onMount(() => {
    void load();
  });

  async function load() {
    loadError = '';
    const { data, error: failure } = await auth.client.getTotpStatus();

    if (failure) {
      loadError = totpErrorMessage(failure, 'Could not load your authenticator app.');
      return;
    }

    status = data;
  }

  function show(next: 'view' | 'enroll' | 'disable') {
    mode = next;
    notice = '';
    error = '';
    code = '';
  }

  async function enrolled() {
    show('view');
    notice = 'Authenticator app added.';
    await load();
  }

  async function disable(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    error = '';

    if (code.length !== TOTP_CODE_LENGTH) {
      error = `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`;
      return;
    }

    busy = true;

    try {
      const { error: failure } = await auth.client.disableTotp(code);

      if (failure) {
        error = totpErrorMessage(failure, 'Could not turn off the authenticator app.');
        code = '';
        return;
      }

      show('view');
      notice = 'Authenticator app turned off.';
      await load();
    } finally {
      busy = false;
    }
  }
</script>

<AuthLayout>
  <section aria-labelledby="seamless-authenticator-heading">
    <h2 id="seamless-authenticator-heading" class="sa-heading">Authenticator app</h2>
    <p class="sa-description">Sign in with a code from an app such as 1Password or Google Authenticator.</p>

    {#if notice}
      <p class="sa-success" role="status">{notice}</p>
    {/if}

    {#if loadError}
      <p class="sa-error" role="alert">{loadError}</p>
      <button type="button" class="sa-secondary" onclick={load}>Try again</button>
    {:else if !status}
      <div class="sa-center">
        <div class="sa-spinner" aria-hidden="true"></div>
        <span>Loading...</span>
      </div>
    {:else if mode === 'enroll'}
      <TotpEnrollment onEnrolled={enrolled} />
      <button type="button" class="sa-link" onclick={() => show('view')}>Cancel</button>
    {:else if mode === 'disable'}
      <form onsubmit={disable}>
        <span class="sa-label">Enter a current code from your authenticator app to turn it off</span>
        <OtpInput bind:value={code} length={TOTP_CODE_LENGTH} mode="numeric" name="totp-disable" />
        {#if error}
          <p class="sa-error" role="alert">{error}</p>
        {/if}
        <button type="submit" class="sa-button" disabled={busy}>
          {busy ? 'Turning off...' : 'Turn off authenticator app'}
        </button>
        <button type="button" class="sa-link" disabled={busy} onclick={() => show('view')}>
          Cancel
        </button>
      </form>
    {:else if status.enabled}
      <p class="sa-helper-text">
        On{status.verifiedAt ? `, added ${formatDate(status.verifiedAt)}` : ''}{status.lastUsedAt
          ? `, last used ${formatDate(status.lastUsedAt)}`
          : ''}.
      </p>
      <button type="button" class="sa-secondary" onclick={() => show('disable')}>
        Turn off
      </button>
    {:else}
      <p class="sa-helper-text">Not set up.</p>
      <button type="button" class="sa-button" onclick={() => show('enroll')}>
        Set up authenticator app
      </button>
    {/if}
  </section>
</AuthLayout>
