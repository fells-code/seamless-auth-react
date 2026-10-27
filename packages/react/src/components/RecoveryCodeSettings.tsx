/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  generateRecoveryCodesWithStepUp,
  type RecoveryCodeStatus,
  recoveryErrorMessage,
} from '@seamless-auth/client';
import React, { useCallback, useEffect, useState } from 'react';

import RecoveryCodeList from '@/components/RecoveryCodeList';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useStepUpPrompt } from '@/hooks/useStepUpPrompt';
import styles from '@/styles/accountSecurity.module.css';

/**
 * How many recovery codes are left, and a way to generate a new set. Replacing a
 * set asks the user to confirm it is them first (passkey or authenticator app),
 * which the API requires.
 */
export const RecoveryCodeSettings: React.FC = () => {
  const authClient = useAuthClient();
  const stepUp = useStepUpPrompt();
  const [status, setStatus] = useState<RecoveryCodeStatus | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: statusError } = await authClient.getRecoveryCodeStatus();

    if (statusError) {
      setError(recoveryErrorMessage(statusError, 'Could not load your recovery codes.'));
      return;
    }

    setStatus(data);
  }, [authClient]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setError('');

    const outcome = await generateRecoveryCodesWithStepUp({
      client: authClient,
      verifyStepUp: stepUp.verifyStepUp,
    });

    setBusy(false);

    if (outcome.kind === 'error') {
      if (!stepUp.cancelled()) setError(outcome.message);
      return;
    }

    setCodes(outcome.codes.codes);
  };

  const done = () => {
    setCodes(null);
    void load();
  };

  const hasSet = (status?.total ?? 0) > 0;

  return (
    <section className={styles.section} aria-labelledby="seamless-recovery-codes-heading">
      <h3 id="seamless-recovery-codes-heading" className={styles.heading}>
        Recovery codes
      </h3>
      <p className={styles.description}>
        Single-use codes that sign you in if you lose your passkeys.
      </p>

      {codes ? (
        <RecoveryCodeList codes={codes} onDone={done} doneLabel="Done" />
      ) : (
        <>
          {status && !status.enabled && (
            <p className={styles.notice}>
              Recovery codes are turned off for this application.
            </p>
          )}

          {status?.enabled && (
            <>
              <p
                className={
                  hasSet && status.remaining <= 2 ? styles.warning : styles.notice
                }
              >
                {hasSet
                  ? `${status.remaining} of ${status.total} codes left${
                      status.createdAt
                        ? `, created ${new Date(status.createdAt).toLocaleDateString()}`
                        : ''
                    }.`
                  : 'You have no recovery codes yet.'}
              </p>
              <button
                type="button"
                className={styles.button}
                onClick={() => void generate()}
                disabled={busy}
              >
                {busy
                  ? 'Generating...'
                  : hasSet
                    ? 'Replace recovery codes'
                    : 'Generate recovery codes'}
              </button>
              {hasSet && (
                <p className={styles.meta}>
                  Replacing your codes stops the old ones working. You will be asked to
                  confirm it is you first.
                </p>
              )}
              {stepUp.prompt}
            </>
          )}
        </>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
};

export default RecoveryCodeSettings;
