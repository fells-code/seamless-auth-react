<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  Where an emailed magic link lands. Verifies the link once, tells the tab that
  asked for it, and signs this tab in too when the link was opened in the same
  browser. Opened on another device, the link is held and the screen asks
  whether to sign the requesting device in.
-->
<script module lang="ts">
  // Tokens this page has already spent. A link can be used once, and a screen
  // that mounts again (a Back press, a wrapper that remounts) must not send it
  // a second time.
  const spent = new Set<string>();
</script>

<script lang="ts">
  import {
    confirmMagicLinkSignIn,
    finishMagicLinkSignIn,
    getMagicLinkConfirmation,
    magicLinkConfirmationPrompt,
    type MagicLinkOutcome,
  } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  let outcome = $state<MagicLinkOutcome | null>(null);
  let error = $state('');
  let prompt = $state('');
  let decision = $state<'pending' | 'confirming' | 'confirmed' | 'declined'>('pending');
  let confirmError = $state('');
  let heldToken: string | null = null;
  let active = true;

  async function confirm() {
    if (!heldToken || decision === 'confirming') return;

    decision = 'confirming';
    confirmError = '';

    const result = await confirmMagicLinkSignIn({ client: auth.client, token: heldToken });

    if (!active) return;

    if (result.error) {
      decision = 'pending';
      confirmError =
        'We could not confirm this sign-in. The link may have expired or already been used.';
      return;
    }

    spent.add(heldToken);
    decision = 'confirmed';
  }

  // Browser only. A server render would spend the single-use link in a request
  // that carries none of this browser's cookies.
  onMount(() => {
    active = true;
    let redirect: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const token = navigator.query('token');

      if (!token) {
        error = 'Missing token for verification.';
        return;
      }

      if (spent.has(token)) {
        error = 'This sign-in link has already been used.';
        return;
      }
      spent.add(token);

      // The token is read; keep it out of history and Referers from here on.
      void navigator.dropQuery().catch(() => undefined);

      // A link can be used once, and a mounted screen verifies it once.
      const result = await auth.client.verifyMagicLink(token);

      if (!active) return;

      if (result.error) {
        const held = getMagicLinkConfirmation(result.error);
        if (held) {
          // Held, not used: a remount may ask again.
          spent.delete(token);
          heldToken = token;
          prompt = magicLinkConfirmationPrompt(held);
          return;
        }

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
  {#if prompt}
    {@const asking = decision === 'pending' || decision === 'confirming'}
    <div class="sa-center">
      <h1 class="sa-heading">Confirm this sign-in</h1>

      {#if asking}
        <p class="sa-description">{prompt}</p>
        <p class="sa-helper-text">
          This link was opened on a different device from the one that asked for it. Only
          continue if you made that request.
        </p>
      {/if}
      {#if decision === 'confirmed'}
        <p class="sa-success" role="status">
          Sign-in approved. You can return to your other device to continue.
        </p>
      {/if}
      {#if decision === 'declined'}
        <p class="sa-helper-text" role="status">
          No one has been signed in. You can ignore the email and close this page.
        </p>
      {/if}
    </div>

    {#if asking}
      <div class="sa-actions">
        <button
          type="button"
          class="sa-button"
          disabled={decision === 'confirming'}
          onclick={() => void confirm()}
        >
          Yes, sign in that device
        </button>
        <button
          type="button"
          class="sa-secondary"
          disabled={decision === 'confirming'}
          onclick={() => (decision = 'declined')}
        >
          No, this wasn't me
        </button>
      </div>
      {#if confirmError}
        <p class="sa-error" role="alert">{confirmError}</p>
      {/if}
    {/if}
  {:else}
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
  {/if}
</AuthLayout>
