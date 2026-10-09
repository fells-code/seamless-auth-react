/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import styles from '@shared-styles/seamless-auth.css';
import { defineComponent, h, onMounted } from 'vue';

import { useSeamlessAuth } from '../../plugin';

const STYLE_ID = 'seamless-auth-styles';

/** Adds the screens' stylesheet to the document once, the first time a screen mounts. */
function installStyles(nonce: string | undefined) {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  if (nonce) style.nonce = nonce;
  style.textContent = styles;
  // First in <head>, so the application's own stylesheets override it.
  document.head.prepend(style);
}

/**
 * The frame every bundled screen renders in. Its stylesheet is unscoped, so an
 * application themes the `.sa-*` classes and `--seamless-*` properties like any
 * other global style.
 */
export const SaAuthLayout = defineComponent({
  name: 'SaAuthLayout',
  props: {
    card: { type: Boolean, default: true },
  },
  setup(props, { slots }) {
    const { styles: options } = useSeamlessAuth();
    onMounted(() => {
      if (options.inject) installStyles(options.nonce);
    });

    return () =>
      h('div', { class: 'sa-auth' }, [
        h('div', { class: props.card ? 'sa-card' : 'sa-center' }, slots.default?.()),
      ]);
  },
});
