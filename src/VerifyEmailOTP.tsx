import { useAuth } from '@/AuthProvider';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './styles/verifyOTP.module.css';
import { createFetchWithAuth } from './fetchWithAuth';
import { isPasskeySupported } from './utils';
import { useInternalAuth } from './context/InternalAuthContext';

// TODO: Rename to something that makes more sense for what it does. (Sending magic link and polling.)
const VerifyEmailOTP: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost, mode } = useAuth();
  const { validateToken } = useInternalAuth();

  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  // TODO: Remove when polling works
  const [emailTimeLeft, setEmailTimeLeft] = useState(300);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  const fetchWithAuth = createFetchWithAuth({
    authMode: mode,
    authHost: apiHost,
  });

  const onResendEmail = async () => {
    setError('');
    const response = await fetchWithAuth(`/magic-link`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      setError(
        'Failed to send Email code. If this persists, refresh the page and try again.'
      );
      return;
    } else {
      setResendMsg('Verification email has been resent.');
    }
  };

  const handleResend = () => {
    setResendMsg('');
    onResendEmail();
    setResendMsg('Verification email has been resent.');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // TODO: REPLACE with a fetch with auth to magic link poll
      setEmailTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function checkSupport() {
      const supported = await isPasskeySupported();
      setPasskeyAvailable(false);
    }

    checkSupport();
  }, []);

  useEffect(() => {
    if (emailVerified) {
      if (passkeyAvailable) {
        navigate('/registerPasskey');
      }

      validateToken().then(() => navigate('/'));
    }
  }, [emailVerified, navigate, validateToken, passkeyAvailable]);

  useEffect(() => {
    fetchWithAuth(`/magic-link`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Verify Your Email Info</h2>
        <p className={styles.subtitle}>
          We sent you a verification email. Click the link in that email to continue.
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {resendMsg && <p className={styles.success}>{resendMsg}</p>}
        <div>
          <div>Awaiting verification of email...</div>
          <button type="button" onClick={() => handleResend()} className={styles.resend}>
            Resend code to email
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className={styles.toggle}
        >
          Back to login
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailOTP;
