/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { completeOAuthCallback } from '@seamless-auth/client';
import { defineComponent, h, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';

/** The OAuth redirect URI. Finishes a provider sign-in. */
export const SaOAuthCallback = defineComponent({
  name: 'SaOAuthCallback',
  setup() {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();
    const route = useRoute();
    const error = ref('');

    // Browser only: the code is single use, and a server render has neither the
    // browser's cookies nor a window.
    onMounted(async () => {
      const params = new URLSearchParams();
      for (const name of ['code', 'state']) {
        const value = route.query[name];
        if (typeof value === 'string') params.set(name, value);
      }

      // The code and state are read; keep them out of history and Referers.
      void navigation.dropQuery();

      const outcome = await completeOAuthCallback(auth, params, window.location.origin);

      if (outcome.kind === 'error') {
        error.value = outcome.message;
        return;
      }

      if (outcome.kind === 'enroll_passkey') {
        await navigation.toScreen('registerPasskey', { returnTo: outcome.returnTo });
        return;
      }

      await navigation.toLocation(outcome.destination);
    });

    return () =>
      h(SaAuthLayout, { card: false }, () => [
        h(
          'h2',
          { class: 'sa-heading' },
          error.value ? 'Sign-in failed' : 'Completing sign-in...'
        ),
        error.value && [
          h('p', error.value),
          h(
            'button',
            {
              type: 'button',
              class: 'sa-link',
              onClick: () => navigation.toScreen('login'),
            },
            'Back to login'
          ),
        ],
      ]);
  },
});
