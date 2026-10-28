<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  Enrols an authenticator app in place of a passkey, for a device that cannot
  register one or a recovery session that has to add a factor. Enrolling lifts
  the recovery restriction just as a passkey does.
-->
<script lang="ts">
  import { safeReturnPath } from '@seamless-auth/client';

  import { getAuthNavigator } from '../context.js';
  import AuthLayout from './AuthLayout.svelte';
  import TotpEnrollment from './TotpEnrollment.svelte';

  const navigator = getAuthNavigator();
  const returnTo = navigator.state().returnTo;
  const handOver = typeof returnTo === 'string' ? { returnTo } : undefined;
  const finish = () =>
    returnTo === undefined ? navigator.toApp() : navigator.toLocation(safeReturnPath(returnTo));

  let enrolled = $state(false);
</script>

<AuthLayout>
  {#if enrolled}
    <h2 class="sa-heading">Authenticator app added</h2>
    <p class="sa-success" role="status">
      You can now sign in with a code from your authenticator app.
    </p>
    <button type="button" class="sa-button" onclick={finish}>Continue</button>
  {:else}
    <h2 class="sa-heading">Set up an authenticator app</h2>
    <TotpEnrollment
      onEnrolled={() => {
        enrolled = true;
      }}
    />
    <button
      type="button"
      class="sa-link"
      onclick={() => navigator.toScreen('registerPasskey', handOver)}
    >
      Back
    </button>
  {/if}
</AuthLayout>
