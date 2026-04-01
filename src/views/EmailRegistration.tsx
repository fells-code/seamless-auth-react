/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from '@/styles/verifyOTP.module.css';
import { createFetchWithAuth } from '@/fetchWithAuth';
import { isPasskeySupported } from '@/utils';
import { useInternalAuth } from '@/context/InternalAuthContext';
import OtpInput from '@/components/OtpInput';

const EmailRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost, mode } = useAuth();
  const { validateToken } = useInternalAuth();

  const [loading, setLoading] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailTimeLeft, setEmailTimeLeft] = useState(300);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  const fetchWithAuth = createFetchWithAuth({
    authMode: mode,
    authHost: apiHost,
  });

  const onResendEmail = async () => {
    setError('');
    setResendMsg('');

    const response = await fetchWithAuth(`/otp/generate-email-otp`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      setError(
        'Failed to send Email code. If this persists, refresh the page and try again.'
      );
      return;
    }

    setResendMsg('Verification email has been resent.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (emailOtp.length !== 6) {
      setError('Please enter a valid code.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithAuth(`/otp/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken: emailOtp,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        setError('Verification failed.');
        return;
      }

      if (passkeyAvailable) {
        navigate('/registerPasskey');
      } else {
        await validateToken();
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setEmailTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function checkSupport() {
      const supported = await isPasskeySupported();
      setPasskeyAvailable(supported);
    }

    checkSupport();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Verify Your Email</h2>

        <p className={styles.subtitle}>
          We sent you a verification email. Enter the code below.
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {resendMsg && <p className={styles.success}>{resendMsg}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label htmlFor="emailCode" className={styles.label}>
              Email Verification Code
              <span className={styles.timer}>
                {' '}
                — Code expires in {formatTime(emailTimeLeft)}
              </span>
            </label>
            <OtpInput
              length={6}
              value={emailOtp}
              onChange={setEmailOtp}
              inputMode="text"
            />

            <button type="button" onClick={onResendEmail} className={styles.resend}>
              Resend code to email
            </button>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className={styles.toggle}
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmailRegistration;
