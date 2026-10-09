<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  Checks a one-time code sent by email or text message. The previous screen's
  navigation state says whether this is a sign-in (flow: 'login') or a
  registration.
-->
<script lang="ts">
  import {
    formatCountdown,
    OTP_LENGTH,
    OTP_LIFETIME_SECONDS,
    otpResendFailedMessage,
    requestOtp,
    verifyOtp,
    type OtpChannel,
  } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';
  import OtpInput from './OtpInput.svelte';

  let { channel = 'email' }: { channel?: OtpChannel } = $props();

  const COPY = {
    email: {
      title: 'Verify Your Email',
      subtitle: 'We sent you a verification email. Enter the code below.',
      label: 'Email Verification Code',
      resend: 'Resend code to email',
      resent: 'Verification email has been resent.',
    },
    phone: {
      title: 'Verify Your Phone Number',
      subtitle: 'Enter the code sent to your phone number.',
      label: 'Phone Verification Code',
      resend: 'Resend code to phone',
      resent: 'Verification SMS has been resent.',
    },
  } as const;

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  const flow = navigator.state().flow === 'login' ? 'login' : 'register';

  const copy = $derived(COPY[channel]);
  let code = $state('');
  let error = $state('');
  let resendMessage = $state('');
  let loading = $state(false);
  let secondsLeft = $state(OTP_LIFETIME_SECONDS);

  onMount(() => {
    // The registration screen offers passkey enrolment next, which needs this.
    if (channel === 'email') void auth.checkPasskeySupport();

    const timer = setInterval(() => {
      secondsLeft = Math.max(0, secondsLeft - 1);
    }, 1000);
    return () => clearInterval(timer);
  });

  async function resend() {
    error = '';
    resendMessage = '';

    const result = await requestOtp(auth.client, channel, flow);

    if (result.error) {
      error = otpResendFailedMessage(channel);
      return;
    }

    resendMessage = copy.resent;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (loading) return;
    error = '';
    loading = true;

    try {
      const passkeySupported = channel === 'email' ? await auth.checkPasskeySupport() : false;

      const result = await verifyOtp(
        { client: auth.client, refreshSession: auth.refreshSession },
        { channel, flow, code, passkeySupported }
      );

      if (result.error !== null) {
        error = result.error;
        return;
      }

      if (result.next === 'register_passkey') await navigator.toScreen('registerPasskey');
      else if (result.next === 'verify_email') await navigator.toScreen('verifyEmailOtp');
      else await navigator.toApp();
    } catch {
      // Backstop for unexpected errors only.
      error = 'Verification failed.';
    } finally {
      loading = false;
    }
  }
</script>

<AuthLayout>
  <h2 class="sa-heading">{copy.title}</h2>
  <p class="sa-subtitle">{copy.subtitle}</p>

  {#if error}
    <p class="sa-error">{error}</p>
  {/if}
  {#if resendMessage}
    <p class="sa-success">{resendMessage}</p>
  {/if}

  <form onsubmit={submit}>
    <div>
      <span class="sa-label">
        {copy.label}
        <span class="sa-timer">(code expires in {formatCountdown(secondsLeft)})</span>
      </span>
      <OtpInput bind:value={code} length={OTP_LENGTH} mode={channel === 'email' ? 'text' : 'numeric'} />
      <button type="button" class="sa-link" onclick={resend}>{copy.resend}</button>
    </div>

    <button type="submit" class="sa-button" disabled={loading}>
      {loading ? 'Verifying...' : 'Verify & Continue'}
    </button>

    <button type="button" class="sa-link" onclick={() => navigator.toScreen('login')}>
      Back to login
    </button>
  </form>
</AuthLayout>
