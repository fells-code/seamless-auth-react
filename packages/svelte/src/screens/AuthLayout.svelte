<!--
  Copyright © 2026 Fells Code, LLC
  Licensed under the Apache License, Version 2.0
  See LICENSE file in the project root for full license information
-->
<!--
  The frame every bundled screen renders in. Its stylesheet is unscoped, so an
  application themes the .sa-* classes and --seamless-* properties like any
  other global style.
-->
<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  import { getSeamlessAuth } from '../context.js';
  import styles from '../styles.generated.js';

  let { card = true, children }: { card?: boolean; children: Snippet } = $props();

  const STYLE_ID = 'seamless-auth-styles';
  const { styles: options } = getSeamlessAuth();

  onMount(() => {
    if (!options.inject || document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    if (options.nonce) style.nonce = options.nonce;
    style.textContent = styles;
    // First in <head>, so the application's own stylesheets override it.
    document.head.prepend(style);
  });
</script>

<div class="sa-auth">
  <div class={card ? 'sa-card' : 'sa-center'}>
    {@render children()}
  </div>
</div>
