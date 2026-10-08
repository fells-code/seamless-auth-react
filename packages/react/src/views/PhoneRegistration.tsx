/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
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

const PhoneRegistration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useAuth();
  const isLoginFlow = (location.state as { flow?: string } | null)?.flow === 'login';

  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [phoneTimeLeft, setPhoneTimeLeft] = useState(OTP_LIFETIME_SECONDS);

  const authClient = useAuthClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneOtp.length !== OTP_LENGTH) {
      setError('Please enter a valid code.');
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneOTP();
    } catch {
      // Backstop for unexpected errors only. The client reports request
      // failures through `error`, not by throwing.
      setError('Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOTP = async () => {
    if (phoneVerified) return;

    // A registration code leads on to the email code, which the flow sends.
    const { next, error } = await verifyOtp(
      { client: authClient, refreshSession },
      { channel: 'phone', flow: isLoginFlow ? 'login' : 'register', code: phoneOtp }
    );

    if (error !== null) {
      setError(error);
      return;
    }

    if (next === 'verify_email') {
      setPhoneVerified(true);
      navigate(authRoutePaths.verifyEmailOtp);
      return;
    }

    navigate('/');
  };

  const onResendPhone = async () => {
    setError('');
    const { error } = await requestOtp(
      authClient,
      'phone',
      isLoginFlow ? 'login' : 'register'
    );

    if (error) {
      setError(otpResendFailedMessage('phone'));
      return;
    } else {
      setResendMsg('Verification SMS has been resent.');
    }
  };

  const handleResend = async () => {
    setResendMsg('');
    await onResendPhone();
    setResendMsg('Verification SMS has been resent.');
  };

  const getStatusIcon = (verified: boolean | null) => {
    if (verified === true) return <span className="text-green-400 ml-2">✅</span>;
    if (verified === false) return <span className="text-red-400 ml-2">❌</span>;
    return null;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Verify Your Phone Number</h2>
        <p className={styles.subtitle}>Enter the code sent to your phone number.</p>

        {error && <p className={styles.error}>{error}</p>}
        {resendMsg && <p className={styles.success}>{resendMsg}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label htmlFor="phoneCode" className={styles.label}>
              Phone Verification Code {getStatusIcon(phoneVerified)} -{' '}
              <span className={styles.timer}>
                Code expires in: {formatCountdown(phoneTimeLeft)}
              </span>
            </label>
            <OtpInput length={6} value={phoneOtp} onChange={setPhoneOtp} />
            <button
              type="button"
              onClick={() => handleResend()}
              className={styles.resend}
            >
              Resend code to phone
            </button>
          </div>

          <button type="submit" className={styles.button}>
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

export default PhoneRegistration;
