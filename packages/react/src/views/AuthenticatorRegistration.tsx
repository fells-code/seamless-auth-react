/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { safeReturnPath } from '@seamless-auth/client';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/AuthProvider';
import { authRoutePaths } from '@/authRoutePaths';
import TotpEnrollment from '@/components/TotpEnrollment';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import styles from '@/styles/recovery.module.css';

/**
 * Sets up an authenticator app, the alternative to a passkey on the enrollment
 * step. For a recovery session it is the way forward on a device without
 * passkeys. Afterwards it continues to recovery codes, as a passkey does.
 */
const AuthenticatorRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { recoverySession } = useAuth();
  const { passkeySupported } = usePasskeySupport();
  const destination = safeReturnPath(
    (useLocation().state as { returnTo?: unknown } | null)?.returnTo
  );
  const [enrolled, setEnrolled] = useState(false);

  const next = () =>
    navigate(authRoutePaths.recoveryCodes, {
      replace: true,
      state: { returnTo: destination },
    });

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {enrolled ? (
          <div className={styles.form}>
            <h2 className={styles.title}>Authenticator app added</h2>
            <p role="status" className={styles.success}>
              Your authenticator app is set up. Use a code from it to sign in or to
              confirm it is you.
            </p>
            <button type="button" className={styles.button} onClick={next}>
              Continue
            </button>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>Set up an authenticator app</h2>
            {recoverySession && (
              <p className={styles.description}>
                You are signed in to recover your account. Add an authenticator app to
                finish.
              </p>
            )}
            <TotpEnrollment onEnrolled={() => setEnrolled(true)}>
              {passkeySupported && (
                <button
                  type="button"
                  className={styles.link}
                  onClick={() =>
                    navigate(authRoutePaths.registerPasskey, {
                      state: { returnTo: destination },
                    })
                  }
                >
                  Use a passkey instead
                </button>
              )}
            </TotpEnrollment>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthenticatorRegistration;
