/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/AuthProvider';
import { authRoutePaths } from '@/authRoutePaths';
import { completeOAuthCallback } from '@seamless-auth/client';

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

    void completeOAuthCallback(
      { finishOAuthLogin },
      searchParams,
      window.location.origin
    ).then(outcome => {
      if (outcome.kind === 'error') {
        setError(outcome.message);
        return;
      }

      if (outcome.kind === 'enroll_passkey') {
        navigate(authRoutePaths.registerPasskey, {
          state: { returnTo: outcome.returnTo },
        });
        return;
      }

      navigate(outcome.destination);
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
