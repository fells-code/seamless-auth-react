/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { safeReturnPath } from '@seamless-auth/client';
import { defineComponent, h, ref } from 'vue';

import { SaAuthenticatorEnrollment } from '../../components/AuthenticatorEnrollment';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';

/**
 * Adds an authenticator app to the signed-in account. Reached from passkey
 * enrolment, and the way a recovery session on a device without passkeys
 * finishes recovering.
 */
export const SaRegisterAuthenticator = defineComponent({
  name: 'SaRegisterAuthenticator',
  setup() {
    const navigation = useAuthNavigation();
    const returnTo = navigation.state<{ returnTo: unknown }>().returnTo;
    const finish = () =>
      returnTo === undefined
        ? navigation.toApp()
        : navigation.toLocation(safeReturnPath(returnTo));

    const enrolled = ref(false);

    const back = () =>
      navigation.toScreen(
        'registerPasskey',
        typeof returnTo === 'string' ? { returnTo } : undefined
      );

    return () =>
      h(SaAuthLayout, null, () =>
        enrolled.value
          ? [
              h('h2', { class: 'sa-heading' }, 'Authenticator App Added'),
              h(
                'p',
                { class: 'sa-success', role: 'status' },
                'Your authenticator app is set up. Use a code from it the next time you sign in.'
              ),
              h(
                'button',
                { type: 'button', class: 'sa-button', onClick: finish },
                'Continue'
              ),
            ]
          : [
              h('h2', { class: 'sa-heading' }, 'Set Up an Authenticator App'),
              h(SaAuthenticatorEnrollment, {
                onEnrolled: () => {
                  enrolled.value = true;
                },
              }),
              h('button', { type: 'button', class: 'sa-link', onClick: back }, 'Back'),
            ]
      );
  },
});
