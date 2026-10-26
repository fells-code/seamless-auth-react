/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  formatTotpSecret,
  type TotpEnrollmentStartResult,
  totpErrorMessage,
} from '@seamless-auth/client';
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/AuthProvider';
import TotpCodeForm from '@/components/TotpCodeForm';
import TotpQrCode from '@/components/TotpQrCode';
import { useAuthClient } from '@/hooks/useAuthClient';
import recoveryStyles from '@/styles/recovery.module.css';
import styles from '@/styles/totp.module.css';

interface TotpEnrollmentProps {
  /** Called once the first code is verified and the session has been refreshed. */
  onEnrolled: () => void;
  buttonClassName?: string;
  children?: ReactNode;
}

/**
 * Starts an authenticator app enrollment, shows the QR code and setup key, and
 * verifies the first code. Verifying lifts a recovery session's restriction,
 * so the session is refreshed before `onEnrolled` runs.
 */
const TotpEnrollment: React.FC<TotpEnrollmentProps> = ({
  onEnrolled,
  buttonClassName,
  children,
}) => {
  const authClient = useAuthClient();
  const { refreshSession } = useAuth();
  const [enrollment, setEnrollment] = useState<TotpEnrollmentStartResult | null>(null);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  // Each start issues a new secret, and StrictMode runs effects twice.
  const started = useRef(false);

  const start = useCallback(async () => {
    setError('');

    const { data, error: startError } = await authClient.startTotpEnrollment();

    if (startError) {
      setError(
        totpErrorMessage(
          startError,
          'We could not start setting up your authenticator app.'
        )
      );
      return;
    }

    setEnrollment(data);
  }, [authClient]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  const copy = async () => {
    if (!enrollment) return;

    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopyMessage('Copied to the clipboard.');
    } catch {
      setCopyMessage('Copying is not available here. Type the key in instead.');
    }
  };

  const verify = async (code: string) => {
    const { error: verifyError } = await authClient.verifyTotpEnrollment(code);

    if (verifyError) {
      return totpErrorMessage(verifyError, 'We could not verify that code.');
    }

    await refreshSession();
    onEnrolled();
    return null;
  };

  if (!enrollment) {
    return (
      <div className={styles.form}>
        {error ? (
          <>
            <p role="alert" className={recoveryStyles.error}>
              {error}
            </p>
            <button
              type="button"
              className={buttonClassName ?? recoveryStyles.button}
              onClick={() => void start()}
            >
              Try again
            </button>
          </>
        ) : (
          <p role="status" className={recoveryStyles.loading}>
            Preparing your setup key...
          </p>
        )}
        {children}
      </div>
    );
  }

  // Only an otpauth URL is offered as a link, so a misbehaving server cannot
  // hand the page a script URL.
  const appLink = enrollment.otpauthUrl.startsWith('otpauth://')
    ? enrollment.otpauthUrl
    : null;

  return (
    <div>
      <p className={recoveryStyles.description}>
        Scan this QR code with your authenticator app, or enter the setup key by hand.
      </p>

      {appLink && <TotpQrCode value={appLink} />}
      {appLink && (
        <a href={appLink} className={styles.appLink}>
          Open in an authenticator app on this device
        </a>
      )}

      <p className={recoveryStyles.label}>Setup key</p>
      <code className={styles.setupKey}>{formatTotpSecret(enrollment.secret)}</code>
      <div className={recoveryStyles.actions}>
        <button type="button" className={recoveryStyles.secondary} onClick={copy}>
          Copy key
        </button>
      </div>
      {copyMessage && (
        <p role="status" className={recoveryStyles.success}>
          {copyMessage}
        </p>
      )}

      <p className={recoveryStyles.description}>
        Then enter the 6-digit code the app shows.
      </p>
      <TotpCodeForm
        submitLabel="Verify code"
        busyLabel="Verifying..."
        onSubmit={verify}
        buttonClassName={buttonClassName}
      >
        {children}
      </TotpCodeForm>
    </div>
  );
};

export default TotpEnrollment;
