import { useAuth } from '@/AuthProvider';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './styles/verifyOTP.module.css';

const VerifyOTP: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost } = useAuth();

  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [emailTimeLeft, setEmailTimeLeft] = useState(300);
  const [phoneTimeLeft, setPhoneTimeLeft] = useState(300);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (emailOtp.length !== 6) {
      setError('Please enter a valid code.');
      return;
    }

    if (phoneOtp.length !== 6) {
      setError('Please enter a valid code.');
      return;
    }

    setLoading(true);
    try {
      verifyEmailOTP();
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
        const response = await fetch(`${apiHost}otp/verify-phone-otp`, {
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

  const verifyEmailOTP = async () => {
    setLoading(true);
    try {
      if (!emailVerified) {
        const response = await fetch(`${apiHost}otp/verify-email-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            verificationToken: emailOtp,
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          setError('Verification failed.');
        } else {
          setEmailVerified(true);
        }
      }
    } catch (error: unknown) {
      console.error(error);
      setError('Verification failed.');
    }

    setLoading(false);
  };

  const onResendEmail = async () => {
    setError('');
    const response = await fetch(`${apiHost}otp/generate-email-otp`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      setError(
        'Failed to send Email code. If this persists, refresh the page and try again.'
      );
      return;
    } else {
      setResendMsg('Verification email has been resent.');
      if (data.token) {
        // Set a new token
        localStorage.setItem('token', data.token);
      }
    }
  };

  const onResendPhone = async () => {
    setError('');
    const response = await fetch(`${apiHost}otp/generate-phone-otp`, {
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

  const handleResend = (type: 'email' | 'phone') => {
    setResendMsg('');
    if (type === 'email') {
      onResendEmail();
      setResendMsg('Verification email has been resent.');
    } else {
      onResendPhone();
      setResendMsg('Verification SMS has been resent.');
    }
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
      setEmailTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (emailVerified && phoneVerified) {
      navigate('/registerPasskey');
    }
  }, [emailVerified, phoneVerified, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Verify Your Contact Info</h2>
        <p className={styles.subtitle}>
          Enter the codes sent to your email and phone number.
        </p>

        {error && <p className={styles.error}>{error}</p>}
        {resendMsg && <p className={styles.success}>{resendMsg}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label htmlFor="emailCode" className={styles.label}>
              Email Verification Code {getStatusIcon(emailVerified)} -{' '}
              <span className={styles.timer}>
                Code expires in: {formatTime(emailTimeLeft)}
              </span>
            </label>
            <input
              id="emailCode"
              type="text"
              maxLength={6}
              value={emailOtp}
              autoComplete="off"
              onChange={e => {
                setEmailOtp(e.target.value);
                setEmailVerified(null);
              }}
              className={styles.input}
              required
            />
            <button
              type="button"
              onClick={() => handleResend('email')}
              className={styles.resend}
            >
              Resend code to email
            </button>
          </div>

          <div>
            <label htmlFor="phoneCode" className={styles.label}>
              Phone Verification Code {getStatusIcon(phoneVerified)} -{' '}
              <span className={styles.timer}>
                Code expires in: {formatTime(phoneTimeLeft)}
              </span>
            </label>
            <input
              id="phoneCode"
              type="text"
              maxLength={6}
              pattern="\d{6}"
              inputMode="numeric"
              value={phoneOtp}
              autoComplete="off"
              onChange={e => {
                setPhoneOtp(e.target.value);
                setPhoneVerified(null);
              }}
              className={styles.input}
              required
            />
            <button
              type="button"
              onClick={() => handleResend('phone')}
              className={styles.resend}
            >
              Resend code to phone
            </button>
          </div>

          <button type="submit" className={styles.button}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
