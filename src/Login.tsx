import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '@/AuthProvider';
import PhoneInputWithCountryCode from '@/components/phoneInput';
import { useInternalAuth } from '@/context/InternalAuthContext';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './styles/login.module.css';
import { isPasskeySupported, isValidEmail, isValidPhoneNumber } from './utils';
import { createFetchWithAuth } from './fetchWithAuth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost, hasSignedInBefore, mode: authMode } = useAuth();
  const { validateToken } = useInternalAuth();
  const [identifier, setIdentifier] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [phone, setPhone] = useState<string>('');
  const [formErrors, setFormErrors] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [identifierError, setIdentifierError] = useState<string>('');
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  const fetchWithAuth = createFetchWithAuth({
    authMode,
    authHost: apiHost,
  });

  useEffect(() => {
    async function checkSupport() {
      const supported = await isPasskeySupported();
      setPasskeyAvailable(supported);
    }

    checkSupport();

    if (hasSignedInBefore) {
      setMode('login');
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

  const handlePasskeyLogin = async () => {
    try {
      const response = await fetchWithAuth(`/webAuthn/login/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.error('Something went wrong getting webauthn options');
        return;
      }

      const options = await response.json();
      const credential = await startAuthentication({ optionsJSON: options });

      const verificationResponse = await fetchWithAuth(`/webAuthn/login/finish`, {
        method: 'POST',
        body: JSON.stringify({ assertionResponse: credential }),
      });

      if (!verificationResponse.ok) {
        console.error('Failed to verify passkey');
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.message === 'Success') {
        if (verificationResult.mfaLogin) {
          navigate('/mfaLogin');
          return;
        }
        await validateToken();
        navigate('/');
        return;
      } else {
        console.error('Passkey login failed:', verificationResult.message);
      }
    } catch (error) {
      console.error('Passkey login error:', error);
    }
  };

  const login = async () => {
    setFormErrors('');

    try {
      const response = await fetchWithAuth(`/login`, {
        method: 'POST',
        body: JSON.stringify({ identifier, passkeyAvailable }),
      });

      if (!response.ok) {
        setFormErrors('Failed to send login link. Please try again.');
        return;
      }

      await handlePasskeyLogin();
    } catch (err) {
      console.error('Unexpected login error', err);
      setFormErrors(
        'An unexpected error occured. Try again. If the problem persists, try resetting your password'
      );
    }
  };

  const register = async () => {
    setFormErrors('');

    try {
      const response = await fetchWithAuth(`/registration/register`, {
        method: 'POST',
        body: JSON.stringify({ email, phone }),
      });

      if (!response.ok) {
        setFormErrors('Failed to register. Please try again.');
        return;
      }

      const data = await response.json();

      if (data.message === 'Success') {
        navigate('/verifyOTP');
      }
      setFormErrors(
        'An unexpected error occured. Try again. If the problem persists, try resetting your password'
      );
    } catch (err) {
      console.error('Unexpected login error', err);
      setFormErrors(
        'An unexpected error occured. Try again. If the problem persists, try resetting your password'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === 'login') login();
    if (mode === 'register') register();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.heading}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {!passkeyAvailable ? (
          <p className={styles.message}>
            ❌ This device doesn't support passkey login. You must provide or register a
            passkey.
          </p>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default Login;
