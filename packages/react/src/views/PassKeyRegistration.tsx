/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import {
  enrollPasskey,
  hasNonPasskeyLoginMethod,
  safeReturnPath,
  type PasskeyAttachment,
} from '@seamless-auth/client';
import React, { useState } from 'react';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useLoginMethods } from '@/hooks/useLoginMethods';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { useLocation, useNavigate } from 'react-router-dom';

import styles from '@/styles/registerPasskey.module.css';

const PasskeyRegistration: React.FC = () => {
  const { refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported, loading: passkeySupportLoading } = usePasskeySupport();
  const { loginMethods, loading: loginMethodsLoading } = useLoginMethods();
  const navigate = useNavigate();
  // The OAuth callback passes the caller's destination through router state
  // when the API asks for enrollment first.
  const destination = safeReturnPath(
    (useLocation().state as { returnTo?: unknown } | null)?.returnTo
  );

  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');

  // The session already exists by the time this screen renders: the OTP step
  // that led here established it. A passkey is an addition to that session
  // rather than what completes registration, which is what makes leaving
  // without one a legitimate way to finish and not an escape hatch.
  //
  // Gated on another method being enabled. With passkey as the only one, a user
  // who skipped would have no way back into the account they just made.
  const canSkip = hasNonPasskeyLoginMethod(loginMethods);

  const finishWithoutPasskey = async () => {
    await refreshSession();
    navigate(destination);
  };

  const registerPasskey = async (attachment?: PasskeyAttachment) => {
    setStatus('loading');

    const { error } = await enrollPasskey(
      { client: authClient, refreshSession },
      attachment
    );

    if (error) {
      setStatus('error');
      setMessage(error);
      return;
    }

    setStatus('success');
    setMessage('Passkey registered successfully.');
    navigate(destination);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {passkeySupportLoading || loginMethodsLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <span>Checking for Passkey Support...</span>
          </div>
        ) : !passkeySupported ? (
          // This used to be the end of the road: a message and no control of
          // any kind, on a screen the user could not leave. Whether there is a
          // way forward depends on the instance, so say which case this is.
          <div className={styles.supported}>
            <h2 className={styles.title}>Passkeys are not available here</h2>
            <p className={styles.description}>
              {canSkip
                ? 'This device does not support passkeys. You can continue without one and add a passkey later from a device that does.'
                : 'This device does not support passkeys, and this application requires one to sign in. Try again from a device or browser that supports them.'}
            </p>

            {canSkip && (
              <button
                type="button"
                onClick={finishWithoutPasskey}
                className={styles.button}
              >
                Continue
              </button>
            )}
          </div>
        ) : (
          <div className={styles.supported}>
            <h2 className={styles.title}>Secure Your Account with a Passkey</h2>
            <p className={styles.description}>
              Your device supports passkeys! Register one to skip passwords forever.
            </p>

            <button
              onClick={() => registerPasskey()}
              disabled={status === 'loading'}
              className={styles.button}
            >
              {status === 'loading' ? 'Registering...' : 'Register Passkey'}
            </button>

            {/*
              The default above leaves the choice to the deployment policy,
              which offers both kinds. This is the deliberate path for someone
              who has been handed an issued key and should not have to find it
              in the browser's picker.
            */}
            <button
              type="button"
              onClick={() => registerPasskey('cross-platform')}
              disabled={status === 'loading'}
              className={styles.secondary}
            >
              Use a security key instead
            </button>

            {message && (
              <p
                className={`${styles.message} ${
                  status === 'success' ? styles.success : styles.error
                }`}
              >
                {message}
              </p>
            )}

            {canSkip && (
              <button
                type="button"
                onClick={finishWithoutPasskey}
                disabled={status === 'loading'}
                className={styles.skip}
              >
                Skip for now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasskeyRegistration;
