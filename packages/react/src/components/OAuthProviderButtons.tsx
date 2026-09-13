/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useState } from 'react';
import { useHref } from 'react-router-dom';
import { useAuth } from '@/AuthProvider';
import type { OAuthProvider } from '@seamless-auth/client';

import styles from '../styles/login.module.css';

export const OAUTH_PROVIDER_STORAGE_KEY = 'seamless:oauth:provider';

const OAuthProviderButtons: React.FC = () => {
  const { listOAuthProviders, startOAuthLogin, finishOAuthLogin, ports } = useAuth();
  // useHref applies the router basename, so the callback URL stays correct for
  // apps mounted under a non-root basename (for example /app/oauth/callback).
  const callbackHref = useHref('/oauth/callback');
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

    // The callback route reads this to know which provider to finish with.
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, providerId);

    const redirectUri = new URL(callbackHref, window.location.origin).toString();
    const { data, error } = await startOAuthLogin({ providerId, redirectUri });

    if (error) {
      setError('Could not start sign-in with this provider.');
      return;
    }

    // In a browser this navigates away and the callback route finishes the
    // login. A port that hands the callback straight back (an in-app browser
    // session) finishes it here instead.
    const outcome = await ports.oauthRedirect.open(data.authorizationUrl, redirectUri);

    if (outcome.type === 'callback') {
      const finished = await finishOAuthLogin({
        providerId,
        code: outcome.code,
        state: outcome.state,
      });

      if (finished.error) {
        setError('Could not finish sign-in with this provider.');
      }
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
