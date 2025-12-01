import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '@/AuthProvider';
import { useInternalAuth } from '@/context/InternalAuthContext';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './styles/passKeyLogin.module.css';
import { createFetchWithAuth } from './fetchWithAuth';

const PassKeyLogin: React.FC = () => {
  const navigate = useNavigate();
  const { apiHost, mode } = useAuth();
  const { validateToken } = useInternalAuth();

  const fetchWithAuth = createFetchWithAuth({
    authMode: mode,
    authHost: apiHost,
  });

  const handlePasskeyLogin = async () => {
    try {
      const response = await fetchWithAuth(`/webAuthn/login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Something went wrong getting webauthn options');
        return;
      }

      const options = await response.json();
      const credential = await startAuthentication({ optionsJSON: options });

      const verificationResponse = await fetchWithAuth(`/webAuthn/login/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assertionResponse: credential }),
        credentials: 'include',
      });

      if (!verificationResponse.ok) {
        console.error('Failed to verify passkey');
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.message === 'Success') {
        if (verificationResult.mfaLogin) {
          navigate('/mfaLogin');
        }
        await validateToken();
        navigate('/');
        return;
      } else {
        console.error(`Passkey login failed`);
      }
    } catch {
      console.error('Passkey login error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Login with Passkey</h2>
        <button onClick={handlePasskeyLogin} className={styles.button}>
          Use Passkey
        </button>
      </div>
    </div>
  );
};

export default PassKeyLogin;
