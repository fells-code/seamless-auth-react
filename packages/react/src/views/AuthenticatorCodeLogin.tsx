/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { signInWithTotp } from '@seamless-auth/client';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/AuthProvider';
import { authRoutePaths } from '@/authRoutePaths';
import TotpCodeForm from '@/components/TotpCodeForm';
import { useAuthClient } from '@/hooks/useAuthClient';
import styles from '@/styles/recovery.module.css';

/** Signs in with an authenticator app code, on the sign-in the login screen started. */
const AuthenticatorCodeLogin: React.FC = () => {
  const navigate = useNavigate();
  const authClient = useAuthClient();
  const { refreshSession } = useAuth();

  const submit = async (code: string) => {
    const { error } = await signInWithTotp({ client: authClient, refreshSession }, code);

    if (error) return error;

    navigate('/');
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Use an authenticator app</h2>
        <p className={styles.description}>
          Enter the 6-digit code your authenticator app shows for this account.
        </p>

        <TotpCodeForm submitLabel="Sign in" onSubmit={submit}>
          <button
            type="button"
            className={styles.link}
            onClick={() => navigate(authRoutePaths.login)}
          >
            Back to sign in
          </button>
        </TotpCodeForm>
      </div>
    </div>
  );
};

export default AuthenticatorCodeLogin;
