/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { finishMagicLinkSignIn } from '@seamless-auth/client';

import styles from '@/styles/verifyMagiclink.module.css';

type Verification = ReturnType<ReturnType<typeof useAuthClient>['verifyMagicLink']>;

/**
 * Where an emailed magic link lands.
 *
 * Verifying the link does not sign in this tab. The session belongs to the
 * browser that asked for the link, which collects it from `/magic-link/check`
 * with its pre-auth cookie. So once the link is verified, this screen tells
 * that tab, then signs in here too when it can: when the link was opened in
 * the same browser, which holds the same pre-auth cookie. Opened on another
 * device there is nothing to collect, and the screen says to go back.
 */
const VerifyMagicLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<'signed-in' | 'elsewhere' | null>(null);

  const authClient = useAuthClient();
  const { refreshSession } = useAuth();

  // A link can be used once. Strict Mode runs this effect twice in development,
  // and a second request would find the link spent and report a failure, so the
  // remount waits on the first request instead of sending another.
  const verification = useRef<{ token: string; result: Verification } | null>(null);

  useEffect(() => {
    let mounted = true;
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null;

    const verify = async () => {
      if (!token) {
        if (mounted) {
          setError('Missing token for verification.');
        }
        console.error('No magic-link token found.');
        return;
      }

      if (verification.current?.token !== token) {
        verification.current = { token, result: authClient.verifyMagicLink(token) };
      }

      const { error } = await verification.current.result;

      if (!mounted) {
        return;
      }

      if (error) {
        console.error('Failed to verify token');
        setError('Failed to verify token');
        return;
      }

      const outcome = await finishMagicLinkSignIn({
        client: authClient,
        refreshSession,
      });

      if (!mounted) {
        return;
      }

      setOutcome(outcome);

      if (outcome === 'elsewhere') {
        return;
      }

      redirectTimeout = setTimeout(() => {
        if (!mounted) {
          return;
        }

        navigate('/');
      }, 900);
    };
    verify();

    return () => {
      mounted = false;

      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [token, authClient, navigate, refreshSession]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verifying your login</h1>

        <div className={styles.verificationContent}>
          {!outcome && !error && <div className={styles.spinner}></div>}

          {outcome && (
            <div className={styles.successIcon}>
              <svg
                viewBox="0 0 24 24"
                className={styles.checkIcon}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {!outcome && !error && (
            <p className={styles.helperText}>
              Please wait while we securely verify your sign-in link.
            </p>
          )}

          {outcome === 'signed-in' && (
            <p className={styles.successText}>Login verified. Redirecting…</p>
          )}

          {outcome === 'elsewhere' && (
            <p className={styles.successText}>
              Login verified. Return to the device where you requested this link to
              continue.
            </p>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default VerifyMagicLink;
