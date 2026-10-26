/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  cancelRecoveryFromLink,
  type RecoveryCancelOutcome,
  recoveryCancelTokenFromHash,
} from '@seamless-auth/client';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthClient } from '@/hooks/useAuthClient';
import { authRoutePaths } from '@/authRoutePaths';
import styles from '@/styles/recovery.module.css';

/**
 * Where the link in a recovery notice lands. The token rides in the fragment so
 * it never reaches a server log, and it is dropped from the address bar before
 * anything else happens so it does not linger in history or a shared screenshot.
 */
const RecoveryCancel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authClient = useAuthClient();
  const [outcome, setOutcome] = useState<RecoveryCancelOutcome | null>(null);
  // The fragment is gone after the first run, so a second StrictMode run must not
  // read it again.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = recoveryCancelTokenFromHash(location.hash);

    if (location.hash) {
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: location.state }
      );
    }

    void cancelRecoveryFromLink(authClient, token).then(setOutcome);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per visit
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Cancel account recovery</h2>

        {!outcome && (
          <p role="status" className={styles.loading}>
            Cancelling the recovery request...
          </p>
        )}

        {outcome?.kind === 'cancelled' && (
          <div role="status">
            <p className={styles.description}>
              The recovery request this link was sent for is cancelled, if it was still
              open, and no one can finish recovering your account with it. If you did not
              ask to recover your account, someone may know your email address or phone
              number. Sign in and add a second passkey to keep your account safe.
            </p>
          </div>
        )}

        {outcome?.kind === 'error' && (
          <p role="alert" className={styles.error}>
            {outcome.message}
          </p>
        )}

        <button
          type="button"
          className={styles.link}
          onClick={() => navigate(authRoutePaths.login)}
        >
          Go to sign in
        </button>
      </div>
    </div>
  );
};

export default RecoveryCancel;
