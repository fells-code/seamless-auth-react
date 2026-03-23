import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthProvider';
import { useInternalAuth } from '@/context/InternalAuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

import styles from '@/styles/magiclink.module.css';
import { createFetchWithAuth } from '@/fetchWithAuth';

const MagicLinkSent: React.FC = () => {
  const { apiHost, mode: authMode } = useAuth();
  const { validateToken } = useInternalAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchWithAuth = createFetchWithAuth({
    authMode,
    authHost: apiHost,
  });

  const identifier = location.state?.identifier;

  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown(c => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const resend = async () => {
    if (cooldown > 0) return;

    await fetchWithAuth(`/magic-links`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    setCooldown(30);
  };

  useEffect(() => {
    const channel = new BroadcastChannel('seamless-auth');

    channel.onmessage = async event => {
      if (event.data?.type === 'MAGIC_LINK_AUTH_SUCCESS') {
        const response = await fetchWithAuth(`/magic-links/check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.status === 200) {
          await validateToken();
          navigate('/');
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [fetchWithAuth, navigate, validateToken]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetchWithAuth(`/magic-links/check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.status === 200) {
          await validateToken();
          navigate('/');
        }
      } catch {
        /* ignore */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [apiHost, validateToken, navigate]);

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

        <div className={styles.identifier}>{identifier}</div>

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
