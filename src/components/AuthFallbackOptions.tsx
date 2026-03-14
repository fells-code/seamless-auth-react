import React from 'react';
import { isValidEmail, isValidPhoneNumber } from '../utils';

import styles from '../styles/login.module.css';

interface AuthFallbackOptionsProps {
  identifier: string;
  onMagicLink: () => void;
  onPhoneOtp: () => void;
  onPasskeyRetry: () => void;
}

const AuthFallbackOptions: React.FC<AuthFallbackOptionsProps> = ({
  identifier,
  onMagicLink,
  onPhoneOtp,
  onPasskeyRetry,
}) => {
  const showMagicLink = isValidEmail(identifier);
  const showPhoneOtp = isValidPhoneNumber(identifier);

  return (
    <div className={styles.fallbackCard}>
      <div className={styles.fallbackHeader}>Passkeys unavailable on this device</div>

      <p className={styles.fallbackDescription}>Choose another secure sign-in method.</p>

      <div className={styles.fallbackActions}>
        {showMagicLink && (
          <button
            type="button"
            className={styles.fallbackActionButton}
            onClick={onMagicLink}
          >
            <span className={styles.actionTitle}>Email Magic Link</span>
            <span className={styles.actionSubtext}>
              Send a secure sign-in link to your email
            </span>
          </button>
        )}

        {showPhoneOtp && (
          <button
            type="button"
            className={styles.fallbackActionButton}
            onClick={onPhoneOtp}
          >
            <span className={styles.actionTitle}>Text Message Code</span>
            <span className={styles.actionSubtext}>Receive a one-time code via SMS</span>
          </button>
        )}
      </div>

      <button type="button" className={styles.linkButton} onClick={onPasskeyRetry}>
        Try passkey anyway
      </button>
    </div>
  );
};

export default AuthFallbackOptions;
