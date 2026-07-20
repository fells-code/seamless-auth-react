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
import { authRoutePaths } from '@/routes';
import styles from '@/styles/login.module.css';
import { isValidEmail, isValidPhoneNumber } from '../utils';
import AuthFallbackOptions from '@/components/AuthFallbackOptions';
import OAuthProviderButtons from '@/components/OAuthProviderButtons';
import type { LoginMethod } from '@/client/createSeamlessAuthClient';

const DEFAULT_LOGIN_METHODS: LoginMethod[] = ['passkey', 'magic_link', 'phone_otp'];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { hasSignedInBefore, login, handlePasskeyLogin } = useAuth();
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
  const [loginMethods, setLoginMethods] = useState<LoginMethod[]>(DEFAULT_LOGIN_METHODS);
  const [bootstrapToken, setBootstrapToken] = useState<string | null>(null);

  useEffect(() => {
    if (hasSignedInBefore) {
      setMode('login');
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('bootstrapToken');

    if (token && token.length > 10) {
      setBootstrapToken(token);
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

    // Registration starts with just an email; a phone is optional but, if given,
    // must be valid.
    return isValidEmail(email) && (!phone || isValidPhoneNumber(phone));
  };

  const register = async () => {
    setFormErrors('');

    const { data, error } = await authClient.register({
      email,
      phone,
      bootstrapToken,
    });

    if (error) {
      setFormErrors('Failed to register. Please try again.');
      return;
    }

    if (data.message !== 'Success') {
      setFormErrors(
        'An unexpected error occurred. Try again. If the problem persists, contact support.'
      );
      return;
    }

    navigate(authRoutePaths.verifyEmailOtp);
  };

  const sendMagicLink = async () => {
    const { error } = await authClient.requestMagicLink();

    if (error) {
      setFormErrors('Failed to send magic link.');
      return;
    }

    navigate(authRoutePaths.magicLinkSent, { state: { identifier } });
  };

  const sendPhoneOtp = async () => {
    const { error } = await authClient.requestLoginPhoneOtp();

    if (error) {
      setFormErrors('Failed to send OTP.');
      return;
    }

    navigate(authRoutePaths.verifyPhoneOtp, { state: { flow: 'login' } });
  };

  const sendEmailOtp = async () => {
    const { error } = await authClient.requestLoginEmailOtp();

    if (error) {
      setFormErrors('Failed to send email code.');
      return;
    }

    navigate(authRoutePaths.verifyEmailOtp, { state: { flow: 'login' } });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors('');
    setShowFallbackOptions(false);

    try {
      if (mode === 'login') {
        const { data: loginStart, error } = await login(identifier, passkeySupported);

        if (error) {
          setFormErrors('Failed to start sign-in. Please try again.');
          return;
        }

        const availableMethods = loginStart?.loginMethods?.length
          ? loginStart.loginMethods
          : DEFAULT_LOGIN_METHODS;
        setLoginMethods(availableMethods);

        if (passkeySupported && availableMethods.includes('passkey')) {
          const { error: passkeyError } = await handlePasskeyLogin();

          if (!passkeyError) {
            navigate('/');
            return;
          }

          setShowFallbackOptions(true);
          setFormErrors(
            'Passkey sign-in could not be completed. Choose another sign-in method.'
          );
          return;
        }

        setShowFallbackOptions(true);
        return;
      }

      if (mode === 'register') {
        await register();
      }
    } catch {
      // Backstop for unexpected errors only. The client reports request
      // failures through `error`, not by throwing.
      console.error('Failed to continue sign-in.');
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
                    onEmailOtp={sendEmailOtp}
                    onPhoneOtp={sendPhoneOtp}
                    onPasskeyRetry={passkeySupported ? handlePasskeyLogin : undefined}
                    loginMethods={loginMethods}
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

          <OAuthProviderButtons />
        </>
      </div>
    </div>
  );
};

export default Login;
