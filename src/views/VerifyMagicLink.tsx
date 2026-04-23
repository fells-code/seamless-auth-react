/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useState } from 'react';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useNavigate, useSearchParams } from 'react-router-dom';

import styles from '@/styles/verifyMagiclink.module.css';

const VerifyMagicLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const authClient = useAuthClient();

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Missing token for verification.');
        console.error('No token found', token);
        return;
      }

      try {
        const response = await authClient.verifyMagicLink(token);

        if (!response.ok) {
          console.error('Failed to verify token');
          setError('Failed to verify token');
          return;
        }
      } catch (error) {
        console.error(error);
      }

      const channel = new BroadcastChannel('seamless-auth');

      channel.postMessage({
        type: 'MAGIC_LINK_AUTH_SUCCESS',
      });

      setSuccessMsg(
        'You have been verified on the device and browser that initiated this request'
      );

      setTimeout(() => {
        navigate('/');
      }, 900);
    };
    verify();
  }, [token, authClient, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verifying your login</h1>

        <div className={styles.verificationContent}>
          {!successMsg && !error && <div className={styles.spinner}></div>}

          {successMsg && (
            <div className={styles.successIcon}>
              <svg
                viewBox="0 0 24 24"
                className={styles.checkIcon}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {!successMsg && !error && (
            <p className={styles.helperText}>
              Please wait while we securely verify your sign-in link.
            </p>
          )}

          {successMsg && (
            <p className={styles.successText}>Login verified. Redirecting…</p>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default VerifyMagicLink;
