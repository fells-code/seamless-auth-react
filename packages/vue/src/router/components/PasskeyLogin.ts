/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { defineComponent, h, ref } from 'vue';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';

/** Sign in with a passkey alone, without an identifier first. */
export const SaPasskeyLogin = defineComponent({
  name: 'SaPasskeyLogin',
  setup() {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();
    const error = ref('');

    const signIn = async () => {
      error.value = '';
      const result = await auth.handlePasskeyLogin();

      if (result.error) {
        error.value =
          'Passkey sign-in could not be completed. Try another sign-in method.';
        return;
      }

      await navigation.toApp();
    };

    return () =>
      h(SaAuthLayout, null, () => [
        h('h2', { class: 'sa-heading' }, 'Login with Passkey'),
        h(
          'button',
          { type: 'button', class: 'sa-button', onClick: signIn },
          'Use Passkey'
        ),
        error.value && h('p', { class: 'sa-error' }, error.value),
      ]);
  },
});
