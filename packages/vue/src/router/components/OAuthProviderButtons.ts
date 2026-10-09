/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { startOAuthSignIn, type OAuthProvider } from '@seamless-auth/client';
import { defineComponent, h, onMounted, ref } from 'vue';

import { useSeamlessAuth } from '../../plugin';
import { useAuthNavigation } from '../navigation';

/** A button per OAuth provider the instance has enabled. Renders nothing without one. */
export const SaOAuthProviderButtons = defineComponent({
  name: 'SaOAuthProviderButtons',
  props: {
    /**
     * The redirect URI to register with providers. Defaults to the bundled
     * callback screen.
     */
    redirectUri: { type: String, default: undefined },
  },
  setup(props) {
    const auth = useSeamlessAuth();
    const navigation = useAuthNavigation();
    const providers = ref<OAuthProvider[]>([]);
    const error = ref('');

    onMounted(async () => {
      const { data } = await auth.listOAuthProviders();
      providers.value = data?.providers ?? [];
    });

    const select = async (providerId: string) => {
      error.value = '';

      const result = await startOAuthSignIn(
        { actions: auth, oauthRedirect: auth.ports.oauthRedirect },
        {
          providerId,
          redirectUri: props.redirectUri ?? navigation.absoluteUrl('oauthCallback'),
        }
      );

      if (result.error) error.value = result.error;
    };

    return () =>
      providers.value.length === 0
        ? null
        : h('div', { class: 'sa-actions' }, [
            ...providers.value.map(provider =>
              h(
                'button',
                {
                  key: provider.id,
                  type: 'button',
                  class: 'sa-action',
                  onClick: () => select(provider.id),
                },
                [
                  h(
                    'span',
                    { class: 'sa-action-title' },
                    `Continue with ${provider.name}`
                  ),
                ]
              )
            ),
            error.value && h('p', { class: 'sa-error' }, error.value),
          ]);
  },
});
