import { useAuth } from '@/AuthProvider';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from '@/styles/verifyOTP.module.css';
import { createFetchWithAuth } from '../fetchWithAuth';
import OtpInput from '@/components/OtpInput';

const PhoneRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost, mode } = useAuth();

  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [phoneTimeLeft, setPhoneTimeLeft] = useState(300);

  const fetchWithAuth = createFetchWithAuth({
    authMode: mode,
    authHost: apiHost,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneOtp.length !== 6) {
      setError('Please enter a valid code.');
      return;
    }

    setLoading(true);
    try {
      verifyPhoneOTP();
    } catch {
      setError('Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOTP = async () => {
    setLoading(true);
    try {
      if (!phoneVerified) {
        const response = await fetchWithAuth(`/otp/verify-phone-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verificationToken: phoneOtp,
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          setError('Verification failed.');
        } else {
          setPhoneVerified(true);
        }
      }
    } catch (error: unknown) {
      console.error(error);
      setError('Verification failed.');
    }

    setLoading(false);
  };

  const onResendPhone = async () => {
    setError('');
    const response = await fetchWithAuth(`/otp/generate-phone-otp`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      setError(
        'Failed to send SMS code. If this persists, refresh the page and try again.'
      );
      return;
    } else {
      if (data.token) {
        // Set a new token
        localStorage.setItem('token', data.token);
      }
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const nextStep = async () => {
      const response = await fetchWithAuth(`/otp/generate-email-otp`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError(
          'Failed to send Email code. If this persists, refresh the page and try registering again.'
        );
        return;
      } else {
        navigate('/verifyEmailOTP');
      }
    };
    if (phoneVerified) {
      nextStep();
    }
  }, [phoneVerified, navigate, fetchWithAuth]);

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
                Code expires in: {formatTime(phoneTimeLeft)}
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
