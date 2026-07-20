/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/AuthProvider';
import { OAUTH_PROVIDER_STORAGE_KEY } from '@/components/OAuthProviderButtons';

import styles from '@/styles/verifyMagiclink.module.css';

const OAuthCallback: React.FC = () => {
  const { finishOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const providerId = sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY);

    if (!code || !state || !providerId) {
      setError('This sign-in link is missing required information.');
      return;
    }

    void finishOAuthLogin({ providerId, code, state }).then(({ error: finishError }) => {
      if (finishError) {
        setError('We could not complete sign-in. Please try again.');
        return;
      }

      sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
      navigate('/');
    });
  }, [finishOAuthLogin, navigate, searchParams]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        {error ? 'Sign-in failed' : 'Completing sign-in...'}
      </h2>
      {error && (
        <>
          <p>{error}</p>
          <button type="button" onClick={() => navigate('/login')}>
            Back to login
          </button>
        </>
      )}
    </div>
  );
};

export default OAuthCallback;
