/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import PhoneInputWithCountryCode from '@/components/phoneInput';
import React, { useEffect, useState } from 'react';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { useNavigate } from 'react-router-dom';
import styles from '@/styles/login.module.css';
import { isValidEmail, isValidPhoneNumber } from '../utils';
import AuthFallbackOptions from '@/components/AuthFallbackOptions';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const {
    hasSignedInBefore,
    login,
    handlePasskeyLogin,
  } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported } = usePasskeySupport();
  const [identifier, setIdentifier] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [phone, setPhone] = useState<string>('');
  const [formErrors, setFormErrors] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [identifierError, setIdentifierError] = useState<string>('');
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);
  const [bootstrapToken, setBootstrapToken] = useState<string | null>(null);

  useEffect(() => {
    if (hasSignedInBefore) {
      setMode('login');
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('bootstrapToken');

    if (token && token.length > 10) {
      setBootstrapToken(token);
      console.log('Bootstrap token detected in URL');
    }
  }, [hasSignedInBefore]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setEmail(email);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdentifier(value);
  };

  const canSubmit = (): boolean | undefined => {
    if (mode === 'login' && identifier) {
      return isValidEmail(identifier) || isValidPhoneNumber(identifier);
    }

    return isValidEmail(email) && isValidPhoneNumber(phone);
  };

  const register = async () => {
    setFormErrors('');

    try {
      const response = await authClient.register({
        email,
        phone,
        bootstrapToken,
      });

      if (!response.ok) {
        setFormErrors('Failed to register. Please try again.');
        return;
      }

      const data = await response.json();

      if (data.message === 'Success') {
        navigate('/verifyPhoneOTP');
        return;
      }
      setFormErrors(
        'An unexpected error occurred. Try again. If the problem persists, try resetting your password.'
      );
    } catch (err) {
      console.error('Unexpected login error', err);
      setFormErrors(
        'An unexpected error occurred. Try again. If the problem persists, try resetting your password.'
      );
    }
  };

  const sendMagicLink = async () => {
    try {
      const response = await authClient.requestMagicLink();

      if (!response.ok) {
        setFormErrors('Failed to send magic link.');
        return;
      }

      navigate('/magiclinks-sent', { state: { identifier } });
    } catch (err) {
      console.error(err);
      setFormErrors('Failed to send magic link.');
    }
  };

  const sendPhoneOtp = async () => {
    try {
      const response = await authClient.requestPhoneOtp();

      if (!response.ok) {
        setFormErrors('Failed to send OTP.');
        return;
      }

      navigate('/verifyPhoneOTP');
    } catch (err) {
      console.error(err);
      setFormErrors('Failed to send OTP.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors('');
    setShowFallbackOptions(false);

    try {
      if (mode === 'login') {
        const loginRes = await login(identifier, passkeySupported);

        if (loginRes.ok && passkeySupported) {
          const passkeyResult = await handlePasskeyLogin();
          if (passkeyResult) {
            navigate('/');
            return;
          }

          setShowFallbackOptions(true);
          setFormErrors(
            'Passkey sign-in could not be completed. Choose another sign-in method.'
          );
          return;
        }

        if (loginRes.ok) {
          setShowFallbackOptions(true);
          return;
        }

        setFormErrors('Failed to start sign-in. Please try again.');
        return;
      }

      if (mode === 'register') {
        await register();
      }
    } catch (err) {
      console.error(err);
      setFormErrors('Failed to continue sign-in. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.heading}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        <>
          <form onSubmit={handleSubmit}>
            {mode === 'login' && (
              <div className={styles.inputGroup}>
                <label htmlFor="identifier" className={styles.label}>
                  Email Address / Phone Number
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  autoComplete="off"
                  placeholder="Email or Phone Number"
                  className={styles.input}
                  onBlur={() => {
                    if (identifier) {
                      const isValid =
                        isValidEmail(identifier) || isValidPhoneNumber(identifier);
                      setIdentifierError(
                        isValid ? '' : 'Please enter a valid email or phone number'
                      );
                    }
                  }}
                  required
                />
                <p className={styles.helperText}>
                  Phone numbers must include a country code e.g. +1
                </p>
                {showFallbackOptions && (
                  <AuthFallbackOptions
                    identifier={identifier}
                    onMagicLink={sendMagicLink}
                    onPhoneOtp={sendPhoneOtp}
                    onPasskeyRetry={handlePasskeyLogin}
                  />
                )}

                {identifierError && <p className={styles.error}>{identifierError}</p>}
              </div>
            )}
            {mode === 'register' && (
              <>
                <div className={styles.inputGroup}>
                  <label htmlFor="email" className={styles.label}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    autoComplete="off"
                    className={styles.input}
                    onBlur={() => {
                      if (email) {
                        const isValid = isValidEmail(email);
                        setEmailError(isValid ? '' : 'Please enter a valid email');
                      }
                    }}
                    required
                  />
                  {emailError && <p className={styles.error}>{emailError}</p>}
                </div>

                <PhoneInputWithCountryCode
                  phone={phone}
                  setPhone={setPhone}
                  phoneError={phoneError}
                  setPhoneError={setPhoneError}
                />
              </>
            )}
            <button type="submit" className={styles.button} disabled={!canSubmit()}>
              {mode === 'login' ? 'Login' : 'Register'}
            </button>
            {formErrors && <p className={styles.error}>{formErrors}</p>}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className={styles.toggle}
            >
              {mode === 'login'
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </button>
          </form>
        </>
      </div>
    </div>
  );
};

export default Login;
