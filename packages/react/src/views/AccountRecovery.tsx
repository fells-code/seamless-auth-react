/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  type AccountRecoveryChannel,
  type AccountRecoveryStatusResult,
  getRecoveryErrorCode,
  isUnauthenticated,
  recoveryErrorMessage,
} from '@seamless-auth/client';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/AuthProvider';
import { authRoutePaths } from '@/authRoutePaths';
import OtpInput from '@/components/OtpInput';
import { useAuthClient } from '@/hooks/useAuthClient';
import styles from '@/styles/recovery.module.css';

type Step = 'channel' | 'code' | 'status';

const CHANNEL_LABELS: Record<AccountRecoveryChannel, string> = {
  email: 'email',
  phone: 'text message',
};

// The pre-auth token from the login screen lasts minutes, and the waiting period
// hours, so a step after it lapses has to start again from sign-in.
const SIGN_IN_AGAIN =
  'Your sign-in timed out. Sign in again and choose the same recovery method to continue.';

const formatTime = (value: string) => new Date(value).toLocaleString();

/**
 * Self-service recovery for a user with no passkey and no recovery codes. It
 * cannot finish quietly: it waits out a delay, and every verified address on the
 * account is told when it opens.
 */
const AccountRecovery: React.FC = () => {
  const navigate = useNavigate();
  const authClient = useAuthClient();
  const { completeAccountRecovery } = useAuth();

  const [step, setStep] = useState<Step>('channel');
  const [channel, setChannel] = useState<AccountRecoveryChannel>('email');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<AccountRecoveryStatusResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const failWith = (failure: unknown, fallback: string) => {
    // A wrong code is a 401 too, so the code is read before the status.
    setError(
      !getRecoveryErrorCode(failure) && isUnauthenticated(failure)
        ? SIGN_IN_AGAIN
        : recoveryErrorMessage(failure, fallback)
    );
  };

  const run = async (task: () => Promise<void>) => {
    setError('');
    setLoading(true);
    try {
      await task();
    } finally {
      setLoading(false);
    }
  };

  const start = (chosen: AccountRecoveryChannel) =>
    run(async () => {
      setChannel(chosen);
      const { error: startError } = await authClient.startAccountRecovery(chosen);

      if (startError) {
        failWith(startError, 'We could not send a recovery code. Please try again.');
        return;
      }

      setCode('');
      setStep('code');
    });

  const verify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    return run(async () => {
      const { data, error: verifyError } = await authClient.verifyAccountRecovery(code);

      if (verifyError) {
        failWith(verifyError, 'That code did not work. Check it and try again.');
        return;
      }

      setStatus(data);
      setStep('status');
    });
  };

  const checkStatus = () =>
    run(async () => {
      const { data, error: statusError } = await authClient.getAccountRecoveryStatus();

      if (statusError) {
        failWith(statusError, 'We could not check your recovery request.');
        return;
      }

      setStatus(data);
    });

  const complete = () =>
    run(async () => {
      const { error: completeError } = await completeAccountRecovery();

      if (completeError) {
        failWith(completeError, 'We could not finish recovering your account.');
        return;
      }

      navigate(authRoutePaths.registerPasskey, { replace: true });
    });

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Recover your account</h2>

        {step === 'channel' && (
          <div className={styles.form}>
            <p className={styles.description}>
              We will send a code to the email address or phone number on your account.
              For your security, recovery finishes only after a waiting period, and
              everyone on the account is told so they can stop it. If you started recovery
              before, choose the same method to pick it back up.
            </p>
            <div className={styles.choices}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => void start('email')}
                disabled={loading}
              >
                Send a code by email
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => void start('phone')}
                disabled={loading}
              >
                Send a code by text message
              </button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <form onSubmit={verify} className={styles.form}>
            <p className={styles.description}>
              If your account has a verified {CHANNEL_LABELS[channel]} on file, we sent it
              a six-digit code. It expires in ten minutes.
            </p>
            <label htmlFor="recoveryOtp" className={styles.label}>
              Recovery code
            </label>
            <OtpInput length={6} value={code} onChange={setCode} name="recoveryOtp" />
            <button
              type="submit"
              className={styles.button}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              className={styles.link}
              onClick={() => setStep('channel')}
            >
              Use a different method
            </button>
          </form>
        )}

        {step === 'status' && status && (
          <div className={styles.form}>
            {status.state === 'pending' && (
              <>
                <p className={styles.description}>
                  Your recovery request is open. You can finish it after{' '}
                  <strong>{formatTime(status.completesAt)}</strong>. We told every address
                  on your account, and anyone with access to them can cancel it.
                </p>
                <p className={styles.description}>
                  Come back then, sign in again, and choose the same method to finish.
                </p>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => void checkStatus()}
                  disabled={loading}
                >
                  Check again
                </button>
              </>
            )}

            {status.state === 'ready' && (
              <>
                <p className={styles.description}>
                  The waiting period is over. Finishing signs out every session on your
                  account, then you will add a new passkey.
                </p>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => void complete()}
                  disabled={loading}
                >
                  {loading ? 'Finishing...' : 'Finish recovery'}
                </button>
              </>
            )}

            {status.state === 'cancelled' && (
              <p className={styles.description}>
                This recovery request was cancelled. If that was not you, start again.
              </p>
            )}

            {status.state === 'completed' && (
              <p className={styles.description}>
                This recovery request has already been completed.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <button
          type="button"
          className={styles.link}
          onClick={() => navigate(authRoutePaths.login)}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
};

export default AccountRecovery;
