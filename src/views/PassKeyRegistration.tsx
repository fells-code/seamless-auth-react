/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import { PasskeyMetadata } from '@/client/createSeamlessAuthClient';
import React, { useState } from 'react';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { useNavigate } from 'react-router-dom';

import styles from '@/styles/registerPasskey.module.css';
import { parseUserAgent } from '@/utils';
import DeviceNameModal from '@/components/DeviceNameModal';

const PasskeyRegistration: React.FC = () => {
  const { refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported, loading: passkeySupportLoading } = usePasskeySupport();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [pendingMetadata, setPendingMetadata] = useState<{
    platform: string;
    browser: string;
    deviceInfo: string;
  } | null>(null);

  const openDeviceModal = () => {
    const { platform, browser, deviceInfo } = parseUserAgent();

    setPendingMetadata({ platform, browser, deviceInfo });
    setShowDeviceModal(true);
  };

  const continueRegistration = async (friendlyName: string) => {
    if (!pendingMetadata) return;

    const metadata: PasskeyMetadata = {
      friendlyName,
      ...pendingMetadata,
    };

    setStatus('loading');

    try {
      const result = await authClient.registerPasskey(metadata);

      if (!result.success) {
        throw new Error(result.message);
      }

      await refreshSession();
      setStatus('success');
      setMessage(result.message);
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

  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          {passkeySupportLoading || !passkeySupported ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>
                {passkeySupportLoading
                  ? 'Checking for Passkey Support...'
                  : 'Passkeys are not supported on this device.'}
              </span>
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

export default PasskeyRegistration;
