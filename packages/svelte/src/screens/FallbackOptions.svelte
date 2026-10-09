<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!-- The other ways to sign in, offered when a passkey is not the way in. -->
<script lang="ts">
  import {
    fallbackSignInOptions,
    hasFallbackSignInOption,
    type LoginMethod,
  } from '@seamless-auth/client';

  let {
    identifier,
    loginMethods = null,
    onMagicLink,
    onEmailOtp,
    onPhoneOtp,
    onPasskeyRetry,
  }: {
    identifier: string;
    /** Null while the methods are unknown; the options then stay permissive. */
    loginMethods?: LoginMethod[] | null;
    onMagicLink: () => void;
    onEmailOtp?: () => void;
    onPhoneOtp: () => void;
    onPasskeyRetry?: () => void;
  } = $props();

  const options = $derived(
    fallbackSignInOptions(identifier, loginMethods, {
      emailOtp: Boolean(onEmailOtp),
      passkeyRetry: Boolean(onPasskeyRetry),
    })
  );
</script>

{#if hasFallbackSignInOption(options)}
  <div class="sa-fallback">
    <div class="sa-fallback-header">Choose a sign-in method</div>
    <p class="sa-fallback-description">Choose another secure sign-in method.</p>

    <div class="sa-actions">
      {#if options.magicLink}
        <button type="button" class="sa-action" onclick={onMagicLink}>
          <span class="sa-action-title">Email Magic Link</span>
          <span class="sa-action-subtext">Send a secure sign-in link to your email</span>
        </button>
      {/if}
      {#if options.emailOtp}
        <button type="button" class="sa-action" onclick={onEmailOtp}>
          <span class="sa-action-title">Email Code</span>
          <span class="sa-action-subtext">Receive a one-time code by email</span>
        </button>
      {/if}
      {#if options.phoneOtp}
        <button type="button" class="sa-action" onclick={onPhoneOtp}>
          <span class="sa-action-title">Text Message Code</span>
          <span class="sa-action-subtext">Receive a one-time code via SMS</span>
        </button>
      {/if}
    </div>

    {#if options.passkeyRetry}
      <button type="button" class="sa-link" onclick={onPasskeyRetry}>Try passkey anyway</button>
    {/if}
  </div>
{/if}
