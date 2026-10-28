/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  TOTP_CODE_LENGTH,
  totpErrorMessage,
  type TotpStatus,
} from '@seamless-auth/client';
import { defineComponent, h, onMounted, ref } from 'vue';

import { useSeamlessAuth } from '../plugin';
import { SaAuthLayout } from '../router/components/AuthLayout';
import { SaOtpInput } from '../router/components/OtpInput';
import { SaAuthenticatorEnrollment, TOTP_CODE_HINT } from './AuthenticatorEnrollment';

/**
 * Whether the signed-in account has an authenticator app, with a way to add one
 * or turn it off. Needs no router, so it fits on any settings page.
 */
export const SaAuthenticatorAppSettings = defineComponent({
  name: 'SaAuthenticatorAppSettings',
  setup() {
    const auth = useSeamlessAuth();

    const status = ref<TotpStatus | null>(null);
    const view = ref<'status' | 'enroll' | 'disable'>('status');
    const loadError = ref('');
    const error = ref('');
    const notice = ref('');
    const code = ref('');
    const busy = ref(false);

    const load = async () => {
      loadError.value = '';
      const { data, error: failure } = await auth.client.getTotpStatus();

      if (failure) {
        loadError.value = totpErrorMessage(
          failure,
          'Could not load your authenticator app status.'
        );
        return;
      }

      status.value = data;
    };

    onMounted(() => void load());

    const show = (next: typeof view.value) => {
      view.value = next;
      error.value = '';
      notice.value = '';
      code.value = '';
    };

    const enrolled = async () => {
      show('status');
      notice.value = 'Authenticator app added.';
      await load();
    };

    const disable = async (event: Event) => {
      event.preventDefault();
      if (busy.value) return;
      error.value = '';

      if (code.value.length !== TOTP_CODE_LENGTH) {
        error.value = TOTP_CODE_HINT;
        return;
      }

      busy.value = true;
      const { error: failure } = await auth.client.disableTotp(code.value);
      busy.value = false;

      if (failure) {
        code.value = '';
        error.value = totpErrorMessage(
          failure,
          'Could not turn off the authenticator app.'
        );
        return;
      }

      show('status');
      notice.value = 'Authenticator app turned off.';
      await load();
    };

    const cancel = () =>
      h(
        'button',
        { type: 'button', class: 'sa-link', onClick: () => show('status') },
        'Cancel'
      );

    const body = () => {
      if (loadError.value) {
        return [
          h('p', { class: 'sa-error', role: 'alert' }, loadError.value),
          h('button', { type: 'button', class: 'sa-button', onClick: load }, 'Try again'),
        ];
      }

      if (!status.value) {
        return h('div', { class: 'sa-center' }, [
          h('div', { class: 'sa-spinner', 'aria-hidden': 'true' }),
          h('span', 'Loading...'),
        ]);
      }

      if (view.value === 'enroll') {
        return [h(SaAuthenticatorEnrollment, { onEnrolled: enrolled }), cancel()];
      }

      if (view.value === 'disable') {
        return h('form', { onSubmit: disable }, [
          h(
            'p',
            { class: 'sa-description' },
            'Enter the current code from your authenticator app to turn it off.'
          ),
          h(SaOtpInput, {
            modelValue: code.value,
            'onUpdate:modelValue': (value: string) => {
              code.value = value;
            },
            length: TOTP_CODE_LENGTH,
            mode: 'numeric',
            name: 'totp',
          }),
          error.value && h('p', { class: 'sa-error', role: 'alert' }, error.value),
          h(
            'button',
            { type: 'submit', class: 'sa-button', disabled: busy.value },
            busy.value ? 'Turning off...' : 'Turn off authenticator app'
          ),
          cancel(),
        ]);
      }

      const { enabled, lastUsedAt } = status.value;

      return [
        notice.value && h('p', { class: 'sa-success', role: 'status' }, notice.value),
        h(
          'p',
          { class: 'sa-description' },
          enabled
            ? 'An authenticator app is set up for this account.'
            : 'Sign in with a code from an authenticator app, such as when a passkey is not available.'
        ),
        enabled &&
          lastUsedAt &&
          h(
            'p',
            { class: 'sa-helper-text' },
            `Last used ${new Date(lastUsedAt).toLocaleString()}`
          ),
        enabled
          ? h(
              'button',
              { type: 'button', class: 'sa-secondary', onClick: () => show('disable') },
              'Turn off'
            )
          : h(
              'button',
              { type: 'button', class: 'sa-button', onClick: () => show('enroll') },
              'Set up authenticator app'
            ),
      ];
    };

    return () =>
      h(SaAuthLayout, null, () => [
        h('h2', { class: 'sa-heading' }, 'Authenticator App'),
        body(),
      ]);
  },
});
