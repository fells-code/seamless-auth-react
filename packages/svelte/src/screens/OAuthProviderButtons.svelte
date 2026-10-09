<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!-- A button per OAuth provider the instance has enabled. Renders nothing without one. -->
<script lang="ts">
  import { startOAuthSignIn, type OAuthProvider } from '@seamless-auth/client';
  import { onMount } from 'svelte';

  import { getAuthNavigator, getSeamlessAuth } from '../context.js';

  /** The redirect URI to register with providers. Defaults to the bundled callback screen. */
  let { redirectUri }: { redirectUri?: string } = $props();

  const auth = getSeamlessAuth();
  const navigator = getAuthNavigator();
  let providers = $state.raw<OAuthProvider[]>([]);
  let error = $state('');

  onMount(async () => {
    const { data } = await auth.listOAuthProviders();
    providers = data?.providers ?? [];
  });

  async function select(providerId: string) {
    error = '';

    const result = await startOAuthSignIn(
      { actions: auth, oauthRedirect: auth.ports.oauthRedirect },
      { providerId, redirectUri: redirectUri ?? navigator.absoluteUrl('oauthCallback') }
    );

    if (result.error) error = result.error;
  }
</script>

{#if providers.length > 0}
  <div class="sa-actions">
    {#each providers as provider (provider.id)}
      <button type="button" class="sa-action" onclick={() => select(provider.id)}>
        <span class="sa-action-title">Continue with {provider.name}</span>
      </button>
    {/each}
    {#if error}
      <p class="sa-error">{error}</p>
    {/if}
  </div>
{/if}
