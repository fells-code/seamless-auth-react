/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/AuthProvider';
import { getOAuthErrorCode, OAuthErrorCode } from '@/client/errors';
import { OAUTH_PROVIDER_STORAGE_KEY } from '@/components/OAuthProviderButtons';

import styles from '@/styles/verifyMagiclink.module.css';

const GENERIC_ERROR = 'We could not complete sign-in. Please try again.';

const CODE_ERRORS: Record<OAuthErrorCode, string> = {
  oauth_missing_email:
    'Your provider account did not share an email address. Add an email to that account and make it visible, then try again.',
  oauth_email_not_verified:
    'The email address on your provider account is not verified. Verify it with your provider, then try again.',
  oauth_missing_subject:
    'Your provider did not return a usable account identifier. Try again, or sign in with a different method.',
};

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
        const code = getOAuthErrorCode(finishError);
        setError(code ? CODE_ERRORS[code] : GENERIC_ERROR);
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
