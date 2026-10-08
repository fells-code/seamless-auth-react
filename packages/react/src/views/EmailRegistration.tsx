/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import React, { useEffect, useState } from 'react';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { useLocation, useNavigate } from 'react-router-dom';

import { authRoutePaths } from '@/authRoutePaths';
import styles from '@/styles/verifyOTP.module.css';
import OtpInput from '@/components/OtpInput';
import {
  formatCountdown,
  OTP_LENGTH,
  OTP_LIFETIME_SECONDS,
  otpResendFailedMessage,
  requestOtp,
  verifyOtp,
} from '@seamless-auth/client';

const EmailRegistration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported } = usePasskeySupport();
  const isLoginFlow = (location.state as { flow?: string } | null)?.flow === 'login';

  const [loading, setLoading] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailTimeLeft, setEmailTimeLeft] = useState(OTP_LIFETIME_SECONDS);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const onResendEmail = async () => {
    setError('');
    setResendMsg('');

    const { error } = await requestOtp(
      authClient,
      'email',
      isLoginFlow ? 'login' : 'register'
    );

    if (error) {
      setError(otpResendFailedMessage('email'));
      return;
    }

    setResendMsg('Verification email has been resent.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (emailOtp.length !== OTP_LENGTH) {
      setError('Please enter a valid code.');
      return;
    }

    setLoading(true);

    try {
      const { next, error } = await verifyOtp(
        { client: authClient, refreshSession },
        {
          channel: 'email',
          flow: isLoginFlow ? 'login' : 'register',
          code: emailOtp,
          passkeySupported,
        }
      );

      if (error !== null) {
        setError(error);
        return;
      }

      navigate(next === 'register_passkey' ? authRoutePaths.registerPasskey : '/');
    } catch {
      // Backstop for unexpected errors only. The client reports request
      // failures through `error`, not by throwing.
      console.error('Email OTP verification failed.');
      setError('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setEmailTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
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
                — Code expires in {formatCountdown(emailTimeLeft)}
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
