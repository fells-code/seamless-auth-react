/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useState } from 'react';
import { useHref } from 'react-router-dom';
import { useAuth } from '@/AuthProvider';
import {
  OAUTH_CALLBACK_PATH,
  startOAuthSignIn,
  type OAuthProvider,
} from '@seamless-auth/client';

import styles from '../styles/login.module.css';

export { OAUTH_PROVIDER_STORAGE_KEY } from '@seamless-auth/client';

const OAuthProviderButtons: React.FC = () => {
  const { listOAuthProviders, startOAuthLogin, finishOAuthLogin, ports } = useAuth();
  // useHref applies the router basename, so the callback URL stays correct for
  // apps mounted under a non-root basename (for example /app/oauth/callback).
  const callbackHref = useHref(OAUTH_CALLBACK_PATH);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void listOAuthProviders().then(({ data }) => {
      if (active) setProviders(data?.providers ?? []);
    });

    return () => {
      active = false;
    };
  }, [listOAuthProviders]);

  if (providers.length === 0) {
    return null;
  }

  const handleSelect = async (providerId: string) => {
    setError('');

    const redirectUri = new URL(callbackHref, window.location.origin).toString();
    const { error } = await startOAuthSignIn(
      {
        actions: { startOAuthLogin, finishOAuthLogin },
        oauthRedirect: ports.oauthRedirect,
      },
      { providerId, redirectUri }
    );

    if (error) {
      setError(error);
    }
  };

  return (
    <div className={styles.fallbackActions}>
      {providers.map(provider => (
        <button
          key={provider.id}
          type="button"
          className={styles.fallbackActionButton}
          onClick={() => handleSelect(provider.id)}
        >
          <span className={styles.actionTitle}>Continue with {provider.name}</span>
        </button>
      ))}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default OAuthProviderButtons;
