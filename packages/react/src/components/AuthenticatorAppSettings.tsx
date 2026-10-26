/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { type TotpStatus, totpErrorMessage } from '@seamless-auth/client';
import React, { useCallback, useEffect, useState } from 'react';

import TotpCodeForm from '@/components/TotpCodeForm';
import TotpEnrollment from '@/components/TotpEnrollment';
import { useAuthClient } from '@/hooks/useAuthClient';
import styles from '@/styles/accountSecurity.module.css';

type Mode = 'view' | 'enroll' | 'disable';

const formatDate = (value: string) => new Date(value).toLocaleDateString();

/**
 * Whether an authenticator app is set up, with a way to add one or turn it off.
 * Turning it off takes a current code from the app, which is the API's proof.
 */
export const AuthenticatorAppSettings: React.FC = () => {
  const authClient = useAuthClient();
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const { data, error: statusError } = await authClient.getTotpStatus();

    if (statusError) {
      setError(
        totpErrorMessage(statusError, 'Could not load your authenticator app settings.')
      );
      return;
    }

    setError('');
    setStatus(data);
  }, [authClient]);

  useEffect(() => {
    void load();
  }, [load]);

  const show = (next: Mode) => {
    setNotice('');
    setMode(next);
  };

  const enrolled = () => {
    setMode('view');
    setNotice('Authenticator app added.');
    void load();
  };

  const disable = async (code: string) => {
    const { error: disableError } = await authClient.disableTotp(code);

    if (disableError) {
      return totpErrorMessage(disableError, 'Could not turn off your authenticator app.');
    }

    setMode('view');
    setNotice('Authenticator app turned off.');
    void load();
    return null;
  };

  return (
    <section className={styles.section} aria-labelledby="seamless-totp-heading">
      <h3 id="seamless-totp-heading" className={styles.heading}>
        Authenticator app
      </h3>
      <p className={styles.description}>
        Six-digit codes from an app on your phone, for signing in and confirming it is
        you.
      </p>

      {mode === 'enroll' && (
        <TotpEnrollment onEnrolled={enrolled} buttonClassName={styles.button}>
          <button type="button" className={styles.secondary} onClick={() => show('view')}>
            Cancel
          </button>
        </TotpEnrollment>
      )}

      {mode === 'disable' && (
        <>
          <p className={styles.notice}>
            Enter the current code from your authenticator app to turn it off.
          </p>
          <TotpCodeForm
            submitLabel="Turn off authenticator app"
            busyLabel="Turning off..."
            onSubmit={disable}
            buttonClassName={styles.danger}
          >
            <button
              type="button"
              className={styles.secondary}
              onClick={() => show('view')}
            >
              Cancel
            </button>
          </TotpCodeForm>
        </>
      )}

      {mode === 'view' && status && (
        <>
          <p className={styles.notice}>
            {status.enabled
              ? `Turned on${
                  status.verifiedAt ? ` since ${formatDate(status.verifiedAt)}` : ''
                }. ${
                  status.lastUsedAt
                    ? `Last used ${formatDate(status.lastUsedAt)}.`
                    : 'Not used yet.'
                }`
              : 'No authenticator app is set up.'}
          </p>
          {status.enabled ? (
            <button
              type="button"
              className={styles.danger}
              onClick={() => show('disable')}
            >
              Turn off
            </button>
          ) : (
            <button
              type="button"
              className={styles.button}
              onClick={() => show('enroll')}
            >
              Set up authenticator app
            </button>
          )}
        </>
      )}

      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
};

export default AuthenticatorAppSettings;
