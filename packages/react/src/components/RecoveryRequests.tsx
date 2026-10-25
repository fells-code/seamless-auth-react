/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { type AccountRecoveryRequest, recoveryErrorMessage } from '@seamless-auth/client';
import React, { useEffect, useState } from 'react';

import { useAuthClient } from '@/hooks/useAuthClient';
import styles from '@/styles/accountSecurity.module.css';

const CHANNEL_LABELS: Record<AccountRecoveryRequest['channel'], string> = {
  email: 'email',
  phone: 'text message',
};

const formatTime = (value: string) => new Date(value).toLocaleString();

/**
 * Open account recovery requests on the signed-in account, so the owner can stop
 * one they did not start without waiting for the notice.
 */
export const RecoveryRequests: React.FC = () => {
  const authClient = useAuthClient();
  const [requests, setRequests] = useState<AccountRecoveryRequest[] | null>(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void authClient.listAccountRecoveryRequests().then(({ data, error: listError }) => {
      if (!active) return;

      if (listError) {
        setError(recoveryErrorMessage(listError, 'Could not load recovery requests.'));
        return;
      }

      setRequests(data.requests);
    });

    return () => {
      active = false;
    };
  }, [authClient]);

  const cancel = async (id: string) => {
    setCancelling(id);
    setError('');

    const { error: cancelError } = await authClient.cancelAccountRecoveryRequest(id);

    setCancelling(null);

    if (cancelError) {
      setError(
        recoveryErrorMessage(cancelError, 'Could not cancel the recovery request.')
      );
      return;
    }

    setRequests(current => current?.filter(request => request.id !== id) ?? null);
  };

  return (
    <section
      className={styles.section}
      aria-labelledby="seamless-recovery-requests-heading"
    >
      <h3 id="seamless-recovery-requests-heading" className={styles.heading}>
        Account recovery requests
      </h3>

      {requests?.length === 0 && (
        <p className={styles.description}>No one is trying to recover this account.</p>
      )}

      {requests && requests.length > 0 && (
        <>
          <p className={styles.warning}>
            Someone asked to recover this account. If it was not you, cancel the request.
          </p>
          <ul className={styles.list}>
            {requests.map(request => (
              <li key={request.id} className={styles.item}>
                <div>
                  <span className={styles.itemName}>
                    Recovery by {CHANNEL_LABELS[request.channel]}
                  </span>
                  <p className={styles.meta}>
                    Requested {formatTime(request.requestedAt)}
                    {request.state === 'ready'
                      ? ' · Can be completed now'
                      : ` · Completes ${formatTime(request.completesAt)}`}
                  </p>
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={() => void cancel(request.id)}
                    disabled={cancelling === request.id}
                  >
                    {cancelling === request.id ? 'Cancelling...' : 'Cancel request'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
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

export default RecoveryRequests;
