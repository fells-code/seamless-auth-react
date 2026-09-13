/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import { PasskeyAttachment, PasskeyMetadata } from '@seamless-auth/client';
import {
  getPasskeyPolicyErrorCode,
  isUnauthenticated,
  type PasskeyPolicyErrorCode,
} from '@seamless-auth/client';
import React, { useState } from 'react';
import { useAuthClient } from '@/hooks/useAuthClient';
import { hasNonPasskeyLoginMethod, useLoginMethods } from '@/hooks/useLoginMethods';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { useNavigate } from 'react-router-dom';

import styles from '@/styles/registerPasskey.module.css';
import { parseUserAgent } from '@/utils';

const POLICY_REFUSAL_MESSAGES: Record<PasskeyPolicyErrorCode, string> = {
  attachment_not_allowed:
    'This application does not accept that kind of authenticator. Try the other option.',
  synced_passkey_not_allowed:
    'This passkey syncs to a password manager, and this application requires one that stays on a single device, such as a security key.',
  authenticator_not_allowed: 'This application does not accept this authenticator.',
  prf_required:
    'This authenticator does not support a feature this application requires.',
};

function policyRefusalMessage(error: unknown): string | undefined {
  const code = getPasskeyPolicyErrorCode(error);

  return code ? POLICY_REFUSAL_MESSAGES[code] : undefined;
}

const PasskeyRegistration: React.FC = () => {
  const { refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported, loading: passkeySupportLoading } = usePasskeySupport();
  const { loginMethods, loading: loginMethodsLoading } = useLoginMethods();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');

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

  const registerPasskey = async (attachment?: PasskeyAttachment) => {
    const { platform, browser, deviceInfo } = parseUserAgent();

    const metadata: PasskeyMetadata = {
      // The credential still carries a label, but asking for one here put a
      // form between the user and the browser prompt they came for. The device
      // it was enrolled on identifies it well enough to rename later.
      friendlyName: deviceInfo,
      platform,
      browser,
      deviceInfo,
    };

    setStatus('loading');

    try {
      const { error } = await authClient.registerPasskey({ metadata, attachment });

      if (error) {
        throw error;
      }

      await refreshSession();
      setStatus('success');
      setMessage('Passkey registered successfully.');
      navigate('/');
    } catch (error) {
      console.error('Passkey registration failed.');
      setStatus('error');
      // A policy refusal names something the user can act on, for example
      // reaching for a security key instead. A 401 is the session, not the
      // authenticator: enrollment takes the signed-in one, so the answer is to
      // sign in again rather than to try a different key. Anything else stays
      // generic.
      setMessage(
        policyRefusalMessage(error) ??
          (isUnauthenticated(error)
            ? 'Your session expired before the passkey was saved. Sign in again to add one.'
            : 'Error registering passkey.')
      );
    }
  };

  return (
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
              onClick={() => registerPasskey()}
              disabled={status === 'loading'}
              className={styles.button}
            >
              {status === 'loading' ? 'Registering...' : 'Register Passkey'}
            </button>

            {/*
              The default above leaves the choice to the deployment policy,
              which offers both kinds. This is the deliberate path for someone
              who has been handed an issued key and should not have to find it
              in the browser's picker.
            */}
            <button
              type="button"
              onClick={() => registerPasskey('cross-platform')}
              disabled={status === 'loading'}
              className={styles.secondary}
            >
              Use a security key instead
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
  );
};

export default PasskeyRegistration;
