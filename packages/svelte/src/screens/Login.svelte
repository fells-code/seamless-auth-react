<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!-- Sign in with an email or phone number, or create an account with an email. -->
<script lang="ts">
  import {
    beginSignIn,
    isValidEmail,
    isValidPhoneNumber,
    PASSKEY_SIGN_IN_FAILED,
    registerWithEmail,
    type LoginMethod,
  } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';
  import FallbackOptions from './FallbackOptions.svelte';
  import OAuthProviderButtons from './OAuthProviderButtons.svelte';

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();

  // Opens on Sign In for a browser that has signed in before.
  let chosenMode = $state<'login' | 'register' | null>(null);
  const mode = $derived(chosenMode ?? (auth.hasSignedInBefore ? 'login' : 'register'));

  let identifier = $state('');
  let email = $state('');
  let identifierError = $state('');
  let emailError = $state('');
  let formError = $state('');
  let showFallbackOptions = $state(false);
  let loginMethods = $state.raw<LoginMethod[] | null>(null);
  let submitting = $state(false);

  const canSubmit = $derived(
    mode === 'login'
      ? isValidEmail(identifier) || isValidPhoneNumber(identifier)
      : // Registration only needs a valid email. A phone can be added later.
        isValidEmail(email)
  );

  // A disabled button is skipped by screen readers and explains nothing to
  // anyone else, so the reason it is refusing lives in a live region instead.
  const submitHint = $derived.by(() => {
    if (mode === 'login') {
      if (!identifier) return 'Enter your email or phone number to continue.';
      return canSubmit
        ? 'Ready to continue.'
        : 'This does not look like a complete email or phone number yet.';
    }

    if (!email) return 'Enter your email address to continue.';
    return canSubmit
      ? 'Ready to continue.'
      : 'This does not look like a complete email address yet.';
  });

  onMount(() => {
    void auth.loadLoginMethods();
    void auth.checkPasskeySupport();
  });

  function validateIdentifier() {
    if (!identifier) return;
    identifierError =
      isValidEmail(identifier) || isValidPhoneNumber(identifier)
        ? ''
        : 'Please enter a valid email or phone number';
  }

  function validateEmail() {
    if (!email) return;
    emailError = isValidEmail(email) ? '' : 'Please enter a valid email';
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    formError = '';
    showFallbackOptions = false;
    submitting = true;

    try {
      if (mode === 'register') {
        const { error } = await registerWithEmail(auth.client, email);

        if (error) {
          formError = error;
          return;
        }

        await navigator.toScreen('verifyEmailOtp');
        return;
      }

      // Both are cached, so awaiting them costs nothing once loaded and removes
      // the race where a fast submit saw passkeys as unsupported.
      const [passkeySupported, configuredMethods] = await Promise.all([
        auth.checkPasskeySupport(),
        auth.loadLoginMethods(),
      ]);

      const step = await beginSignIn(auth, { identifier, passkeySupported, configuredMethods });

      if (step.kind === 'error') {
        formError = step.message;
        return;
      }

      if (step.kind === 'signed_in') {
        await navigator.toApp();
        return;
      }

      loginMethods = step.loginMethods;
      showFallbackOptions = true;

      if (step.passkeyFailed) formError = PASSKEY_SIGN_IN_FAILED;
    } catch {
      // Backstop for unexpected errors only. The client reports request
      // failures through `error`, not by throwing.
      formError = 'Failed to continue sign-in. Please try again.';
    } finally {
      submitting = false;
    }
  }

  async function retryPasskey() {
    formError = '';
    const { error } = await auth.handlePasskeyLogin();

    if (error) {
      formError = PASSKEY_SIGN_IN_FAILED;
      return;
    }

    await navigator.toApp();
  }

  async function sendMagicLink() {
    const { error } = await auth.client.requestMagicLink();

    if (error) {
      formError = 'Failed to send magic link.';
      return;
    }

    await navigator.toScreen('magicLinkSent', { identifier });
  }

  async function sendEmailOtp() {
    const { error } = await auth.client.requestLoginEmailOtp();

    if (error) {
      formError = 'Failed to send email code.';
      return;
    }

    await navigator.toScreen('verifyEmailOtp', { flow: 'login' });
  }

  async function sendPhoneOtp() {
    const { error } = await auth.client.requestLoginPhoneOtp();

    if (error) {
      formError = 'Failed to send OTP.';
      return;
    }

    await navigator.toScreen('verifyPhoneOtp', { flow: 'login' });
  }
</script>

<AuthLayout>
  <h2 class="sa-heading">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

  <form onsubmit={submit}>
    {#if mode === 'login'}
      <div class="sa-input-group">
        <label for="identifier" class="sa-label">Email Address / Phone Number</label>
        <input
          id="identifier"
          type="text"
          class="sa-input"
          autocomplete="off"
          placeholder="Email or Phone Number"
          required
          bind:value={identifier}
          onblur={validateIdentifier}
        />
        <p class="sa-helper-text">Phone numbers must include a country code e.g. +1</p>

        {#if showFallbackOptions}
          <FallbackOptions
            {identifier}
            {loginMethods}
            onMagicLink={sendMagicLink}
            onEmailOtp={sendEmailOtp}
            onPhoneOtp={sendPhoneOtp}
            onPasskeyRetry={auth.passkeySupported ? retryPasskey : undefined}
          />
        {/if}

        {#if identifierError}
          <p class="sa-error">{identifierError}</p>
        {/if}
      </div>
    {:else}
      <div class="sa-input-group">
        <label for="email" class="sa-label">Email Address</label>
        <input
          id="email"
          type="email"
          class="sa-input"
          autocomplete="off"
          required
          bind:value={email}
          onblur={validateEmail}
        />
        {#if emailError}
          <p class="sa-error">{emailError}</p>
        {/if}
      </div>
    {/if}

    <button
      type="submit"
      class="sa-button"
      disabled={!canSubmit || submitting}
      aria-describedby="seamless-submit-hint"
    >
      {mode === 'login' ? 'Login' : 'Register'}
    </button>
    <p id="seamless-submit-hint" role="status" class="sa-submit-hint">{submitHint}</p>
    {#if formError}
      <p class="sa-error">{formError}</p>
    {/if}
    <button
      type="button"
      class="sa-link"
      onclick={() => (chosenMode = mode === 'login' ? 'register' : 'login')}
    >
      {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
    </button>
  </form>

  <OAuthProviderButtons />
</AuthLayout>
