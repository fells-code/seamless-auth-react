/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  MAGIC_LINK_RESEND_COOLDOWN_SECONDS,
  watchMagicLink,
} from '@seamless-auth/client';
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';
import { SaAuthLayout } from './AuthLayout';

/**
 * Waits for an emailed link to be used, then signs this tab in. A link opened
 * in another tab of this browser reports back at once; one opened on another
 * device is picked up by polling.
 */
export const SaMagicLinkSent = defineComponent({
  name: 'SaMagicLinkSent',
  setup() {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();
    const identifier = navigation.state<{ identifier: string }>().identifier;
    const cooldown = ref(MAGIC_LINK_RESEND_COOLDOWN_SECONDS);
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopWatching: (() => void) | undefined;

    // Browser only: a server render must not poll or open a channel.
    onMounted(() => {
      timer = setInterval(() => {
        cooldown.value = Math.max(0, cooldown.value - 1);
      }, 1000);

      stopWatching = watchMagicLink({
        client: auth.client,
        refreshSession: auth.refreshSession,
        onSignedIn: () => void navigation.toApp(),
      });
    });

    onBeforeUnmount(() => {
      clearInterval(timer);
      stopWatching?.();
    });

    const resend = async () => {
      if (cooldown.value > 0) return;
      await auth.client.requestMagicLink();
      cooldown.value = MAGIC_LINK_RESEND_COOLDOWN_SECONDS;
    };

    return () =>
      h(SaAuthLayout, null, () => [
        h('div', { class: 'sa-center' }, [
          h('h2', { class: 'sa-heading' }, 'Check your email'),
          h(
            'p',
            { class: 'sa-description' },
            'If an account exists for this address, we sent a secure sign-in link.'
          ),
          identifier && h('div', { class: 'sa-identifier' }, identifier),
          h(
            'p',
            { class: 'sa-helper-text' },
            'Open the email and click the link to finish signing in.'
          ),
          h(
            'p',
            { class: 'sa-helper-text' },
            "Didn't receive anything? Check your spam folder or try creating a new account."
          ),
        ]),
        h('div', { class: 'sa-actions' }, [
          h(
            'button',
            {
              type: 'button',
              class: 'sa-secondary',
              disabled: cooldown.value > 0,
              onClick: resend,
            },
            'Resend link'
          ),
          cooldown.value > 0 &&
            h(
              'div',
              { class: 'sa-helper-text sa-center' },
              `Available in ${cooldown.value}s`
            ),
          h(
            'button',
            {
              type: 'button',
              class: 'sa-link',
              onClick: () => navigation.toScreen('login'),
            },
            'Change email or phone'
          ),
        ]),
      ]);
  },
});
