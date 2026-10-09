/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  enrollPasskey,
  hasNonPasskeyLoginMethod,
  safeReturnPath,
  type PasskeyAttachment,
} from '@seamless-auth/client';
import { computed, defineComponent, h, onMounted, ref } from 'vue';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';

/**
 * Offers passkey enrolment to a user who has just signed in. The session
 * already exists by the time this renders, so a passkey is an addition to it,
 * which is what makes leaving without one a legitimate way to finish.
 */
export const SaRegisterPasskey = defineComponent({
  name: 'SaRegisterPasskey',
  setup() {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();
    // The OAuth callback hands over the caller's destination when the API asks
    // for enrolment first.
    const destination = safeReturnPath(
      navigation.state<{ returnTo: unknown }>().returnTo
    );

    const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
    const message = ref('');

    // With passkey as the only enabled method, a user who skipped would have no
    // way back into the account they just made.
    const canSkip = computed(() => hasNonPasskeyLoginMethod(auth.loginMethods.value));

    onMounted(() => {
      void auth.checkPasskeySupport();
      void auth.loadLoginMethods();
    });

    const register = async (attachment?: PasskeyAttachment) => {
      status.value = 'loading';

      const { error } = await enrollPasskey(
        { client: auth.client, refreshSession: auth.refreshSession },
        attachment
      );

      if (error) {
        status.value = 'error';
        message.value = error;
        return;
      }

      status.value = 'success';
      message.value = 'Passkey registered successfully.';
      await navigation.toApp(destination);
    };

    const finishWithoutPasskey = async () => {
      await auth.refreshSession();
      await navigation.toApp(destination);
    };

    const busy = () => status.value === 'loading';

    const unsupported = () => [
      h('h2', { class: 'sa-heading' }, 'Passkeys are not available here'),
      h(
        'p',
        { class: 'sa-description' },
        canSkip.value
          ? 'This device does not support passkeys. You can continue without one and add a passkey later from a device that does.'
          : 'This device does not support passkeys, and this application requires one to sign in. Try again from a device or browser that supports them.'
      ),
      canSkip.value &&
        h(
          'button',
          { type: 'button', class: 'sa-button', onClick: finishWithoutPasskey },
          'Continue'
        ),
    ];

    const supported = () => [
      h('h2', { class: 'sa-heading' }, 'Secure Your Account with a Passkey'),
      h(
        'p',
        { class: 'sa-description' },
        'Your device supports passkeys! Register one to skip passwords forever.'
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'sa-button',
          disabled: busy(),
          onClick: () => register(),
        },
        busy() ? 'Registering...' : 'Register Passkey'
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'sa-secondary',
          disabled: busy(),
          onClick: () => register('cross-platform'),
        },
        'Use a security key instead'
      ),
      message.value &&
        h(
          'p',
          {
            class: status.value === 'success' ? 'sa-success' : 'sa-error',
            role: 'status',
          },
          message.value
        ),
      canSkip.value &&
        h(
          'button',
          {
            type: 'button',
            class: 'sa-link',
            disabled: busy(),
            onClick: finishWithoutPasskey,
          },
          'Skip for now'
        ),
    ];

    return () =>
      h(SaAuthLayout, null, () =>
        auth.passkeySupportLoading.value || auth.loginMethodsLoading.value
          ? h('div', { class: 'sa-center' }, [
              h('div', { class: 'sa-spinner', 'aria-hidden': 'true' }),
              h('span', 'Checking for Passkey Support...'),
            ])
          : auth.passkeySupported.value
            ? supported()
            : unsupported()
      );
  },
});
