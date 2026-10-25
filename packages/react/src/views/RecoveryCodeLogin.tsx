/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { recoveryErrorMessage } from '@seamless-auth/client';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/AuthProvider';
import { authRoutePaths } from '@/authRoutePaths';
import styles from '@/styles/recovery.module.css';

/**
 * Signs in with a recovery code, on the sign-in the login screen started. The
 * session it issues can only enroll a passkey, so that is where it goes next.
 */
const RecoveryCodeLogin: React.FC = () => {
  const navigate = useNavigate();
  const { redeemRecoveryCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { error: redeemError } = await redeemRecoveryCode(code.trim());

    setLoading(false);

    if (redeemError) {
      setError(
        recoveryErrorMessage(
          redeemError,
          'We could not sign you in with that code. Go back and sign in again, then try the code once more.'
        )
      );
      return;
    }

    navigate(authRoutePaths.registerPasskey, { replace: true });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Use a recovery code</h2>
        <p className={styles.description}>
          Enter one of the recovery codes you saved. Once you are in, you will add a new
          passkey.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="recoveryCode" className={styles.label}>
            Recovery code
            <input
              id="recoveryCode"
              className={styles.input}
              value={code}
              onChange={event => setCode(event.target.value)}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXXX-XXXXX"
              required
            />
          </label>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.button}
            disabled={loading || code.trim() === ''}
          >
            {loading ? 'Checking...' : 'Sign in'}
          </button>

          <button
            type="button"
            className={styles.link}
            onClick={() => navigate(authRoutePaths.login)}
          >
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecoveryCodeLogin;
