/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { signInWithTotp, TOTP_CODE_LENGTH } from '@seamless-auth/client';
import { defineComponent, h, ref } from 'vue';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';
import { SaOtpInput } from './OtpInput';

/** Finishes the sign-in the login screen started with a code from an authenticator app. */
export const SaAuthenticatorCode = defineComponent({
  name: 'SaAuthenticatorCode',
  setup() {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();

    const code = ref('');
    const error = ref('');
    const loading = ref(false);

    const submit = async (event: Event) => {
      event.preventDefault();
      if (loading.value) return;
      error.value = '';
      loading.value = true;

      try {
        const result = await signInWithTotp(
          { client: auth.client, refreshSession: auth.refreshSession },
          code.value
        );

        if (result.error !== null) {
          error.value = result.error;
          code.value = '';
          return;
        }

        await navigation.toApp();
      } catch {
        // Backstop for unexpected errors only.
        error.value = 'Verification failed.';
      } finally {
        loading.value = false;
      }
    };

    return () =>
      h(SaAuthLayout, null, () => [
        h('h2', { class: 'sa-heading' }, 'Enter Your Authenticator Code'),
        h(
          'p',
          { class: 'sa-subtitle' },
          `Open your authenticator app and enter the ${TOTP_CODE_LENGTH}-digit code it shows for this account.`
        ),
        error.value && h('p', { class: 'sa-error', role: 'alert' }, error.value),
        h('form', { onSubmit: submit }, [
          h('div', [
            h('span', { class: 'sa-label' }, 'Authenticator Code'),
            h(SaOtpInput, {
              modelValue: code.value,
              'onUpdate:modelValue': (value: string) => {
                code.value = value;
              },
              length: TOTP_CODE_LENGTH,
              mode: 'numeric',
              name: 'totp',
            }),
          ]),
          h(
            'button',
            { type: 'submit', class: 'sa-button', disabled: loading.value },
            loading.value ? 'Verifying...' : 'Verify & Continue'
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'sa-link',
              onClick: () => navigation.toScreen('login'),
            },
            'Back to login'
          ),
        ]),
      ]);
  },
});
