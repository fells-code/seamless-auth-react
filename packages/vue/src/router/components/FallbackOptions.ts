/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  fallbackSignInOptions,
  hasFallbackSignInOption,
  type LoginMethod,
} from '@seamless-auth/client';
import { computed, defineComponent, h, type PropType } from 'vue';

const action = (title: string, subtext: string, onClick: () => void) =>
  h('button', { type: 'button', class: 'sa-action', onClick }, [
    h('span', { class: 'sa-action-title' }, title),
    h('span', { class: 'sa-action-subtext' }, subtext),
  ]);

/** The other ways to sign in, offered when a passkey is not the way in. */
export const SaFallbackOptions = defineComponent({
  name: 'SaFallbackOptions',
  props: {
    identifier: { type: String, required: true },
    /** Null while the methods are unknown; the options then stay permissive. */
    loginMethods: { type: Array as PropType<LoginMethod[] | null>, default: null },
    offerEmailOtp: { type: Boolean, default: true },
    offerPasskeyRetry: { type: Boolean, default: false },
  },
  emits: ['magicLink', 'emailOtp', 'phoneOtp', 'passkeyRetry'],
  setup(props, { emit }) {
    const options = computed(() =>
      fallbackSignInOptions(props.identifier, props.loginMethods, {
        emailOtp: props.offerEmailOtp,
        passkeyRetry: props.offerPasskeyRetry,
      })
    );

    return () => {
      const offered = options.value;
      if (!hasFallbackSignInOption(offered)) return null;

      return h('div', { class: 'sa-fallback' }, [
        h('div', { class: 'sa-fallback-header' }, 'Choose a sign-in method'),
        h(
          'p',
          { class: 'sa-fallback-description' },
          'Choose another secure sign-in method.'
        ),
        h('div', { class: 'sa-actions' }, [
          offered.magicLink &&
            action('Email Magic Link', 'Send a secure sign-in link to your email', () =>
              emit('magicLink')
            ),
          offered.emailOtp &&
            action('Email Code', 'Receive a one-time code by email', () =>
              emit('emailOtp')
            ),
          offered.phoneOtp &&
            action('Text Message Code', 'Receive a one-time code via SMS', () =>
              emit('phoneOtp')
            ),
        ]),
        offered.passkeyRetry &&
          h(
            'button',
            { type: 'button', class: 'sa-link', onClick: () => emit('passkeyRetry') },
            'Try passkey anyway'
          ),
      ]);
    };
  },
});
