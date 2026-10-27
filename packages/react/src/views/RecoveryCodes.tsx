/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { generateRecoveryCodesWithStepUp, safeReturnPath } from '@seamless-auth/client';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import RecoveryCodeList from '@/components/RecoveryCodeList';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useStepUpPrompt } from '@/hooks/useStepUpPrompt';
import styles from '@/styles/recovery.module.css';

type Step = 'loading' | 'show' | 'offer';

/**
 * Offered straight after a passkey or authenticator app is enrolled. A user with no set gets one
 * generated and shown here; a user whose codes are all spent is offered a new
 * set. Anyone else, or an instance with recovery codes off, moves straight on.
 */
const RecoveryCodes: React.FC = () => {
  const navigate = useNavigate();
  const authClient = useAuthClient();
  const stepUp = useStepUpPrompt();
  const destination = safeReturnPath(
    (useLocation().state as { returnTo?: unknown } | null)?.returnTo
  );

  const [step, setStep] = useState<Step>('loading');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [usedUp, setUsedUp] = useState(false);
  // Generating twice would void the first set, and the second request would need a
  // step-up the user has not been asked for. StrictMode runs effects twice.
  const started = useRef(false);

  const finish = () => navigate(destination, { replace: true });

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
      return false;
    }

    setCodes(outcome.codes.codes);
    setStep('show');
    return true;
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const { data, error: statusError } = await authClient.getRecoveryCodeStatus();

      if (statusError || !data.enabled || data.remaining > 0) {
        finish();
        return;
      }

      if (data.total > 0) {
        setUsedUp(true);
        setStep('offer');
        return;
      }

      if (!(await generate())) {
        setStep('offer');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per visit
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Save your recovery codes</h2>

        {step === 'loading' && (
          <p role="status" className={styles.loading}>
            Preparing your recovery codes...
          </p>
        )}

        {step === 'show' && <RecoveryCodeList codes={codes} onDone={finish} />}

        {stepUp.prompt}

        {step === 'offer' && (
          <div className={styles.form}>
            <p className={styles.description}>
              {usedUp
                ? 'You have used all of your recovery codes. Generate a new set so you can still get in if you lose your passkeys.'
                : 'Recovery codes let you sign in if you lose your passkeys.'}
            </p>
            <button
              type="button"
              className={styles.button}
              onClick={() => void generate()}
              disabled={busy}
            >
              {busy ? 'Generating...' : 'Generate recovery codes'}
            </button>
            <button type="button" className={styles.link} onClick={finish}>
              Skip for now
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default RecoveryCodes;
