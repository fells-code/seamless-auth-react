<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<script lang="ts">
  import { untrack } from 'svelte';

  import { setAuthNavigator, setSeamlessAuth, type SeamlessAuth } from '../src';
  import type { AuthNavigator } from '../src/navigation';
  import {
    SaLogin,
    SaMagicLinkSent,
    SaOAuthCallback,
    SaPasskeyLogin,
    SaRegisterPasskey,
    SaVerifyMagicLink,
    SaVerifyOtp,
  } from '../src';

  let {
    auth,
    navigator,
    nav,
  }: {
    auth: SeamlessAuth;
    navigator: AuthNavigator;
    nav: { current: string; path: string };
  } = $props();

  // Context is set once, from the props the test mounted with.
  setSeamlessAuth(untrack(() => auth));
  setAuthNavigator(untrack(() => navigator));
</script>

{#key nav.current}
  {#if nav.current === 'app'}
    <p>You are signed in at {nav.path}</p>
  {:else if nav.current === 'login'}
    <SaLogin />
  {:else if nav.current === 'passkeyLogin'}
    <SaPasskeyLogin />
  {:else if nav.current === 'verifyEmailOtp'}
    <SaVerifyOtp channel="email" />
  {:else if nav.current === 'verifyPhoneOtp'}
    <SaVerifyOtp channel="phone" />
  {:else if nav.current === 'magicLinkSent'}
    <SaMagicLinkSent />
  {:else if nav.current === 'verifyMagicLink'}
    <SaVerifyMagicLink />
  {:else if nav.current === 'oauthCallback'}
    <SaOAuthCallback />
  {:else if nav.current === 'registerPasskey'}
    <SaRegisterPasskey />
  {/if}
{/key}
