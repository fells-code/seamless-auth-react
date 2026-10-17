/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  confirmMagicLinkSignIn,
  finishMagicLinkSignIn,
  getMagicLinkConfirmation,
  type MagicLinkConfirmation,
  magicLinkConfirmationPrompt,
} from '@seamless-auth/client';

import styles from '@/styles/verifyMagiclink.module.css';

type Verification = ReturnType<ReturnType<typeof useAuthClient>['verifyMagicLink']>;

/**
 * Where an emailed magic link lands.
 *
 * Verifying the link does not sign in this tab. The session belongs to the
 * browser that asked for the link, which collects it from `/magic-link/check`
 * with its pre-auth cookie. So once the link is verified, this screen tells
 * that tab, then signs in here too when it can: when the link was opened in
 * the same browser, which holds the same pre-auth cookie.
 *
 * Opened on a device other than the one that asked for it, the link is held
 * rather than used, and the screen asks whether to sign that device in.
 */
const VerifyMagicLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<'signed-in' | 'elsewhere' | null>(null);
  const [confirmation, setConfirmation] = useState<MagicLinkConfirmation | null>(null);
  const [decision, setDecision] = useState<
    'pending' | 'confirming' | 'confirmed' | 'declined'
  >('pending');
  const [confirmError, setConfirmError] = useState('');

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
        const held = getMagicLinkConfirmation(error);
        if (held) {
          setConfirmation(held);
          return;
        }

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

  const confirm = async () => {
    if (!token || decision === 'confirming') return;

    setDecision('confirming');
    setConfirmError('');

    const { error } = await confirmMagicLinkSignIn({ client: authClient, token });

    if (error) {
      setDecision('pending');
      setConfirmError(
        'We could not confirm this sign-in. The link may have expired or already been used.'
      );
      return;
    }

    setDecision('confirmed');
  };

  if (confirmation) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Confirm this sign-in</h1>

          <div className={styles.verificationContent}>
            {(decision === 'pending' || decision === 'confirming') && (
              <>
                <p className={styles.prompt}>
                  {magicLinkConfirmationPrompt(confirmation)}
                </p>
                <p className={styles.helperText}>
                  This link was opened on a different device from the one that asked for
                  it. Only continue if you made that request.
                </p>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={decision === 'confirming'}
                    onClick={() => void confirm()}
                  >
                    Yes, sign in that device
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={decision === 'confirming'}
                    onClick={() => setDecision('declined')}
                  >
                    No, this wasn&apos;t me
                  </button>
                </div>

                {confirmError && (
                  <p className={styles.error} role="alert">
                    {confirmError}
                  </p>
                )}
              </>
            )}

            {decision === 'confirmed' && (
              <p className={styles.successText} role="status">
                Sign-in approved. You can return to your other device to continue.
              </p>
            )}

            {decision === 'declined' && (
              <p className={styles.helperText} role="status">
                No one has been signed in. You can ignore the email and close this page.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

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
