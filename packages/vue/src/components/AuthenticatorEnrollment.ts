/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  formatTotpSecret,
  qrCode,
  TOTP_CODE_LENGTH,
  totpErrorMessage,
  type TotpEnrollmentStartResult,
} from '@seamless-auth/client';
import { defineComponent, h, onMounted, ref } from 'vue';

import { useSeamlessAuth } from '../plugin';
import { SaOtpInput } from '../router/components/OtpInput';

export const TOTP_CODE_HINT = `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`;

function qrImage(otpauthUrl: string) {
  let code: ReturnType<typeof qrCode>;
  try {
    code = qrCode(otpauthUrl);
  } catch {
    return null;
  }

  // The light background keeps the code scannable under a dark theme.
  return h(
    'svg',
    {
      viewBox: `0 0 ${code.size} ${code.size}`,
      width: 200,
      height: 200,
      role: 'img',
      'aria-label': 'QR code for your authenticator app',
      style: { display: 'block', margin: '0 auto 1rem' },
      'shape-rendering': 'crispEdges',
    },
    [
      h('rect', { width: code.size, height: code.size, fill: '#ffffff' }),
      h('path', { d: code.path, fill: '#000000' }),
    ]
  );
}

/**
 * Starts authenticator app enrollment on mount, shows the QR code and the key,
 * and verifies the first code. Emits `enrolled` once the session has been
 * refreshed, so a recovery session has already lost its restriction by then.
 */
export const SaAuthenticatorEnrollment = defineComponent({
  name: 'SaAuthenticatorEnrollment',
  emits: ['enrolled'],
  setup(_, { emit }) {
    const auth = useSeamlessAuth();

    const enrollment = ref<TotpEnrollmentStartResult | null>(null);
    const starting = ref(true);
    const startError = ref('');
    const code = ref('');
    const error = ref('');
    const copyMessage = ref('');
    const verifying = ref(false);

    const start = async () => {
      starting.value = true;
      startError.value = '';
      const { data, error: failure } = await auth.client.startTotpEnrollment();
      starting.value = false;

      if (failure) {
        startError.value = totpErrorMessage(
          failure,
          'Could not start setting up an authenticator app. Please try again.'
        );
        return;
      }

      enrollment.value = data;
    };

    onMounted(() => void start());

    const copySecret = async () => {
      const secret = enrollment.value?.secret ?? '';
      try {
        await navigator.clipboard.writeText(secret);
        copyMessage.value = 'Key copied.';
      } catch {
        copyMessage.value = 'Could not copy the key. Select it and copy it instead.';
      }
    };

    const verify = async (event: Event) => {
      event.preventDefault();
      if (verifying.value) return;
      error.value = '';

      if (code.value.length !== TOTP_CODE_LENGTH) {
        error.value = TOTP_CODE_HINT;
        return;
      }

      verifying.value = true;
      const { error: failure } = await auth.client.verifyTotpEnrollment(code.value);

      if (failure) {
        verifying.value = false;
        code.value = '';
        error.value = totpErrorMessage(failure, 'That code could not be verified.');
        return;
      }

      await auth.refreshSession();
      verifying.value = false;
      emit('enrolled');
    };

    return () => {
      if (starting.value) {
        return h('div', { class: 'sa-center' }, [
          h('div', { class: 'sa-spinner', 'aria-hidden': 'true' }),
          h('span', 'Preparing your authenticator app setup...'),
        ]);
      }

      if (!enrollment.value) {
        return h('div', [
          h('p', { class: 'sa-error', role: 'alert' }, startError.value),
          h(
            'button',
            { type: 'button', class: 'sa-button', onClick: start },
            'Try again'
          ),
        ]);
      }

      const { secret, otpauthUrl } = enrollment.value;

      return h('div', [
        h(
          'p',
          { class: 'sa-description' },
          'Scan this QR code with your authenticator app, or enter the key by hand.'
        ),
        qrImage(otpauthUrl),
        h('p', { class: 'sa-label' }, 'Setup key'),
        h('p', { class: 'sa-identifier' }, [h('code', formatTotpSecret(secret))]),
        h(
          'button',
          { type: 'button', class: 'sa-secondary', onClick: copySecret },
          'Copy key'
        ),
        copyMessage.value && h('p', { role: 'status' }, copyMessage.value),
        // The URL comes from the server, so only an otpauth: one becomes a link.
        otpauthUrl.startsWith('otpauth://') &&
          h(
            'a',
            { class: 'sa-link', href: otpauthUrl },
            'Open in an authenticator app on this device'
          ),
        h('form', { onSubmit: verify }, [
          h('span', { class: 'sa-label' }, 'Code from your authenticator app'),
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
            { type: 'submit', class: 'sa-button', disabled: verifying.value },
            verifying.value ? 'Verifying...' : 'Verify code'
          ),
        ]),
      ]);
    };
  },
});
