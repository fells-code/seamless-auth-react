import {
  type RegistrationResponseJSON,
  startRegistration,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { useAuth } from '@/AuthProvider';
import { useInternalAuth } from '@/context/InternalAuthContext';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from '@/styles/registerPasskey.module.css';
import { isPasskeySupported, parseUserAgent } from './utils';
import { createFetchWithAuth } from './fetchWithAuth';
import DeviceNameModal from './components/DeviceNameModal';

const RegisterPasskey: React.FC = () => {
  const { apiHost, mode } = useAuth();
  const { validateToken } = useInternalAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [pendingMetadata, setPendingMetadata] = useState<{
    platform: string;
    browser: string;
    deviceInfo: string;
  } | null>(null);

  const fetchWithAuth = createFetchWithAuth({
    authMode: mode,
    authHost: apiHost,
  });

  useEffect(() => {
    async function checkSupport() {
      const supported = await isPasskeySupported();
      setPasskeyAvailable(supported);
    }

    checkSupport();
  }, []);

  const openDeviceModal = () => {
    const { platform, browser, deviceInfo } = parseUserAgent();

    setPendingMetadata({ platform, browser, deviceInfo });
    setShowDeviceModal(true);
  };

  const continueRegistration = async (friendlyName: string) => {
    if (!pendingMetadata) return;

    const { platform, browser, deviceInfo } = pendingMetadata;

    setStatus('loading');

    try {
      const challengeRes = await fetchWithAuth(`/webAuthn/register/start`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!challengeRes.ok) {
        throw new Error('Failed to fetch challenge');
      }

      const options = await challengeRes.json();

      let attResp: RegistrationResponseJSON;

      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (error) {
        if (error instanceof WebAuthnError) {
          throw new Error(error.name);
        }
        throw error;
      }

      await verifyPassKey(attResp, {
        friendlyName,
        platform,
        browser,
        deviceInfo,
      });

      setStatus('success');
      setMessage('Passkey registered successfully.');
      navigate('/');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Error registering passkey.');
    } finally {
      setShowDeviceModal(false);
      setPendingMetadata(null);
    }
  };

  const verifyPassKey = async (
    attResp: RegistrationResponseJSON,
    metadata: {
      friendlyName: string;
      platform: string;
      browser: string;
      deviceInfo: string;
    }
  ) => {
    const verificationResp = await fetchWithAuth(`/webAuthn/register/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attestationResponse: attResp,
        metadata,
      }),
      credentials: 'include',
    });

    if (!verificationResp.ok) {
      throw new Error('Verification failed');
    }

    await validateToken();
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          {!passkeyAvailable ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Checking for Passkey Support...</span>
            </div>
          ) : (
            <div className={styles.supported}>
              <h2 className={styles.title}>Secure Your Account with a Passkey</h2>
              <p className={styles.description}>
                Your device supports passkeys! Register one to skip passwords forever.
              </p>

              <button
                onClick={openDeviceModal}
                disabled={status === 'loading'}
                className={styles.button}
              >
                {status === 'loading' ? 'Registering...' : 'Register Passkey'}
              </button>

              {message && (
                <p
                  className={`${styles.message} ${
                    status === 'success' ? styles.success : styles.error
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <DeviceNameModal
        isOpen={showDeviceModal}
        onCancel={() => {
          setShowDeviceModal(false);
          setPendingMetadata(null);
        }}
        onConfirm={continueRegistration}
      />
    </>
  );
};

export default RegisterPasskey;
