/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  confirmMagicLinkSignIn,
  finishMagicLinkSignIn,
  getMagicLinkConfirmation,
  magicLinkConfirmationPrompt,
  type MagicLinkOutcome,
} from '@seamless-auth/client';
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';

/**
 * Where an emailed magic link lands. Verifies the link once, tells the tab that
 * asked for it, and signs this tab in too when the link was opened in the same
 * browser. Opened on another device, the link is held and the screen asks
 * whether to sign the requesting device in.
 */
export const SaVerifyMagicLink = defineComponent({
  name: 'SaVerifyMagicLink',
  setup() {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();
    const tokenParam = useRoute().query.token;
    const token = typeof tokenParam === 'string' ? tokenParam : null;

    const outcome = ref<MagicLinkOutcome | null>(null);
    const error = ref('');
    const prompt = ref('');
    const decision = ref<'pending' | 'confirming' | 'confirmed' | 'declined'>('pending');
    const confirmError = ref('');
    let active = true;
    let redirect: ReturnType<typeof setTimeout> | undefined;

    onBeforeUnmount(() => {
      active = false;
      clearTimeout(redirect);
    });

    // Browser only. A server render would spend the single-use link in a request
    // that carries none of this browser's cookies.
    onMounted(async () => {
      if (!token) {
        error.value = 'Missing token for verification.';
        return;
      }

      // The token is read; keep it out of history and Referers from here on.
      void navigation.dropQuery();

      // A link can be used once, and a mounted component verifies it once.
      const result = await auth.client.verifyMagicLink(token);

      if (!active) return;

      if (result.error) {
        const held = getMagicLinkConfirmation(result.error);
        if (held) {
          prompt.value = magicLinkConfirmationPrompt(held);
          return;
        }

        error.value = 'Failed to verify token';
        return;
      }

      const next = await finishMagicLinkSignIn({
        client: auth.client,
        refreshSession: auth.refreshSession,
      });

      if (!active) return;

      outcome.value = next;

      if (next === 'signed-in') {
        redirect = setTimeout(() => void navigation.toApp(), 900);
      }
    });

    const confirm = async () => {
      if (!token || decision.value === 'confirming') return;

      decision.value = 'confirming';
      confirmError.value = '';

      const result = await confirmMagicLinkSignIn({ client: auth.client, token });

      if (!active) return;

      if (result.error) {
        decision.value = 'pending';
        confirmError.value =
          'We could not confirm this sign-in. The link may have expired or already been used.';
        return;
      }

      decision.value = 'confirmed';
    };

    const renderConfirmation = () => {
      const asking = decision.value === 'pending' || decision.value === 'confirming';

      return [
        h('div', { class: 'sa-center' }, [
          h('h1', { class: 'sa-heading' }, 'Confirm this sign-in'),
          asking && [
            h('p', { class: 'sa-description' }, prompt.value),
            h(
              'p',
              { class: 'sa-helper-text' },
              'This link was opened on a different device from the one that asked for it. Only continue if you made that request.'
            ),
          ],
          decision.value === 'confirmed' &&
            h(
              'p',
              { class: 'sa-success', role: 'status' },
              'Sign-in approved. You can return to your other device to continue.'
            ),
          decision.value === 'declined' &&
            h(
              'p',
              { class: 'sa-helper-text', role: 'status' },
              'No one has been signed in. You can ignore the email and close this page.'
            ),
        ]),
        asking &&
          h('div', { class: 'sa-actions' }, [
            h(
              'button',
              {
                type: 'button',
                class: 'sa-button',
                disabled: decision.value === 'confirming',
                onClick: () => void confirm(),
              },
              'Yes, sign in that device'
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'sa-secondary',
                disabled: decision.value === 'confirming',
                onClick: () => {
                  decision.value = 'declined';
                },
              },
              "No, this wasn't me"
            ),
          ]),
        asking &&
          confirmError.value &&
          h('p', { class: 'sa-error', role: 'alert' }, confirmError.value),
      ];
    };

    return () =>
      h(SaAuthLayout, null, () =>
        prompt.value
          ? renderConfirmation()
          : h('div', { class: 'sa-center' }, [
              h('h1', { class: 'sa-heading' }, 'Verifying your login'),
              !outcome.value &&
                !error.value && [
                  h('div', { class: 'sa-spinner', 'aria-hidden': 'true' }),
                  h(
                    'p',
                    { class: 'sa-helper-text' },
                    'Please wait while we securely verify your sign-in link.'
                  ),
                ],
              outcome.value === 'signed-in' &&
                h(
                  'p',
                  { class: 'sa-success', role: 'status' },
                  'Login verified. Redirecting...'
                ),
              outcome.value === 'elsewhere' &&
                h(
                  'p',
                  { class: 'sa-success', role: 'status' },
                  'Login verified. Return to the device where you requested this link to continue.'
                ),
              error.value && h('p', { class: 'sa-error', role: 'alert' }, error.value),
            ])
      );
  },
});
