/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import { PasskeyMetadata } from '@/client/createSeamlessAuthClient';
import React, { useState } from 'react';
import { useAuthClient } from '@/hooks/useAuthClient';
import { hasNonPasskeyLoginMethod, useLoginMethods } from '@/hooks/useLoginMethods';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { useNavigate } from 'react-router-dom';

import styles from '@/styles/registerPasskey.module.css';
import { parseUserAgent } from '@/utils';
import DeviceNameModal from '@/components/DeviceNameModal';

const PasskeyRegistration: React.FC = () => {
  const { refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported, loading: passkeySupportLoading } = usePasskeySupport();
  const { loginMethods, loading: loginMethodsLoading } = useLoginMethods();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [pendingMetadata, setPendingMetadata] = useState<{
    platform: string;
    browser: string;
    deviceInfo: string;
  } | null>(null);

  // The session already exists by the time this screen renders: the OTP step
  // that led here established it. A passkey is an addition to that session
  // rather than what completes registration, which is what makes leaving
  // without one a legitimate way to finish and not an escape hatch.
  //
  // Gated on another method being enabled. With passkey as the only one, a user
  // who skipped would have no way back into the account they just made.
  const canSkip = hasNonPasskeyLoginMethod(loginMethods);

  const finishWithoutPasskey = async () => {
    await refreshSession();
    navigate('/');
  };

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
      const { error } = await authClient.registerPasskey(metadata);

      if (error) {
        throw error;
      }

      await refreshSession();
      setStatus('success');
      setMessage('Passkey registered successfully.');
      navigate('/');
    } catch {
      console.error('Passkey registration failed.');
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
          {passkeySupportLoading || loginMethodsLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Checking for Passkey Support...</span>
            </div>
          ) : !passkeySupported ? (
            // This used to be the end of the road: a message and no control of
            // any kind, on a screen the user could not leave. Whether there is a
            // way forward depends on the instance, so say which case this is.
            <div className={styles.supported}>
              <h2 className={styles.title}>Passkeys are not available here</h2>
              <p className={styles.description}>
                {canSkip
                  ? 'This device does not support passkeys. You can continue without one and add a passkey later from a device that does.'
                  : 'This device does not support passkeys, and this application requires one to sign in. Try again from a device or browser that supports them.'}
              </p>

              {canSkip && (
                <button
                  type="button"
                  onClick={finishWithoutPasskey}
                  className={styles.button}
                >
                  Continue
                </button>
              )}
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

              {canSkip && (
                <button
                  type="button"
                  onClick={finishWithoutPasskey}
                  disabled={status === 'loading'}
                  className={styles.skip}
                >
                  Skip for now
                </button>
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
