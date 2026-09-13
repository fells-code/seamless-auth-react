/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/AuthProvider';
import { getOAuthErrorCode, OAuthErrorCode } from '@seamless-auth/client';
import { OAUTH_PROVIDER_STORAGE_KEY } from '@/components/OAuthProviderButtons';

import styles from '@/styles/verifyMagiclink.module.css';

const GENERIC_ERROR = 'We could not complete sign-in. Please try again.';

/**
 * The in-app path a `returnTo` names, or null.
 *
 * The auth server validated the destination against its configured origins before
 * signing it into the state, so this is not the guard against an open redirect. It is
 * a narrower question: these bundled views route with react-router, which can only
 * move within this application, so a destination on another origin is not somewhere
 * this component can send anyone. An adopter that wants to leave the app reads
 * `returnTo` off the client result and navigates itself.
 */
function inAppPath(returnTo: string | undefined): string | null {
  if (!returnTo) return null;

  try {
    const target = new URL(returnTo, window.location.origin);

    if (target.origin !== window.location.origin) return null;

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

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

    void finishOAuthLogin({ providerId, code, state }).then(
      ({ data, error: finishError }) => {
        if (finishError) {
          const code = getOAuthErrorCode(finishError);
          setError(code ? CODE_ERRORS[code] : GENERIC_ERROR);
          return;
        }

        sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
        navigate(inAppPath(data?.returnTo) ?? '/');
      }
    );
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
