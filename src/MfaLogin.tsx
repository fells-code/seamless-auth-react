import { useAuth } from '@/AuthProvider';
import { useInternalAuth } from '@/context/InternalAuthContext';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './styles/mfaLogin.module.css';
import { createFetchWithAuth } from './fetchWithAuth';

const MfaLogin: React.FC = () => {
  const { apiHost, mode } = useAuth();
  const { validateToken } = useInternalAuth();
  const navigate = useNavigate();
  const [OTP, setOTP] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const maskedPhone = '****1234';
  const maskedEmail = 'j***@example.com';

  const fetchWithAuth = createFetchWithAuth({
    authMode: mode,
    authHost: apiHost,
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOTP();
    } catch {
      setError('Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const endpoint =
      selectedMethod === 'phone'
        ? 'otp/verify-login-phone-otp'
        : 'otp/verify-login-email-otp';

    try {
      const response = await fetchWithAuth(`/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verificationToken: OTP }),
        credentials: 'include',
      });

      if (!response.ok) {
        setError('Verification failed.');
        return;
      }

      await validateToken();
      navigate('/');
    } catch (err) {
      console.error('Error verifying OTP', err);
      setError('Verification failed.');
    }
  };

  const sendOTP = async (target: string) => {
    setError('');
    const endpoint =
      target === 'phone'
        ? 'otp/generate-login-phone-otp'
        : 'otp/generate-login-email-otp';

    try {
      const response = await fetchWithAuth(`/${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        setError(
          `Failed to send ${target} code. If this persists, refresh the page and try again.`
        );
      } else {
        setResendMsg(
          `Verification ${target === 'phone' ? 'SMS' : 'email'} has been sent.`
        );
      }
    } catch {
      setError(
        `Failed to send ${target} code. If this persists, refresh the page and try again.`
      );
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Multi-factor Authentication</h2>

        {resendMsg && <p className={styles.msg}>{resendMsg}</p>}

        <div className={styles.buttonGroup}>
          <button
            onClick={() => {
              setSelectedMethod('phone');
              sendOTP('phone');
            }}
            className={`${styles.button} ${
              selectedMethod === 'phone' ? styles.selected : ''
            }`}
          >
            Send code to phone: <span className="font-mono">{maskedPhone}</span>
          </button>

          <button
            onClick={() => {
              setSelectedMethod('email');
              sendOTP('email');
            }}
            className={`${styles.button} ${
              selectedMethod === 'email' ? styles.selected : ''
            }`}
          >
            Send code to email: <span className="font-mono">{maskedEmail}</span>
          </button>
        </div>

        {selectedMethod && (
          <>
            {error && <p className={styles.error}>{error}</p>}
            <label htmlFor="otp" className={styles.codeLabel}>
              Enter the 6-digit code sent to your {selectedMethod}. <br />
              <span className={styles.countdown}>
                Code expires in: {formatTime(timeLeft)}
              </span>
            </label>
            <input
              id="otp"
              type="text"
              maxLength={6}
              className={styles.input}
              placeholder="••••••"
              onChange={e => setOTP(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              className={styles.submit}
              disabled={!OTP || OTP.length < 6 || loading}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MfaLogin;
