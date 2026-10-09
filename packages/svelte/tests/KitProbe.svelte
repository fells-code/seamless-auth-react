<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<script lang="ts">
  import { untrack } from 'svelte';

  import type { SeamlessAuth } from '../src';
  import { createKitNavigator } from '../src/kit';
  import type { AuthNavigator } from '../src/navigation';

  let {
    auth,
    onNavigator,
  }: { auth: SeamlessAuth; onNavigator: (navigator: AuthNavigator) => void } = $props();

  untrack(() => onNavigator(createKitNavigator(auth)));
</script>
