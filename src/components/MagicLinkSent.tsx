/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
import { useNavigate, useLocation } from 'react-router-dom';

import styles from '@/styles/magiclink.module.css';

const MagicLinkSent: React.FC = () => {
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const authClient = useAuthClient();

  const identifier = location.state?.identifier as string | undefined;

  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown(c => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const resend = async () => {
    if (cooldown > 0) return;

    await authClient.requestMagicLink();

    setCooldown(30);
  };

  // The poll endpoint answers 204 while the emailed link is still unused, and
  // only reports Success once it has been consumed. A bare ok check would treat
  // that 204 as completion and redirect before the user clicks the link.
  const magicLinkCompleted = useCallback(async () => {
    const { data, error } = await authClient.checkMagicLink();

    return !error && data?.message === 'Success';
  }, [authClient]);

  useEffect(() => {
    const channel = new BroadcastChannel('seamless-auth');

    channel.onmessage = async event => {
      if (event.data?.type === 'MAGIC_LINK_AUTH_SUCCESS') {
        if (await magicLinkCompleted()) {
          await refreshSession();
          navigate('/');
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [magicLinkCompleted, navigate, refreshSession]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (await magicLinkCompleted()) {
          await refreshSession();
          navigate('/');
        }
      } catch {
        /* ignore */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [magicLinkCompleted, refreshSession, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <div className={styles.iconRing}></div>

          <svg
            className={styles.mailIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 6h16v12H4z" />
            <path d="m4 6 8 6 8-6" />
          </svg>
        </div>

        <h2 className={styles.heading}>Check your email</h2>

        <p className={styles.message}>
          If an account exists for this address, we sent a secure sign-in link.
        </p>

        {identifier && <div className={styles.identifier}>{identifier}</div>}

        <p className={styles.helperText}>
          Open the email and click the link to finish signing in.
        </p>

        <p className={styles.helperText}>
          Didn’t receive anything? Check your spam folder or try creating a new account.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            disabled={cooldown > 0}
            onClick={resend}
          >
            Resend link
          </button>

          {cooldown > 0 && (
            <div className={styles.cooldown}>Available in {cooldown}s</div>
          )}

          <button className={styles.linkButton} onClick={() => navigate('/login')}>
            Change email or phone
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagicLinkSent;
