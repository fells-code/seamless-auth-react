/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import React from 'react';
import { isValidEmail, isValidPhoneNumber } from '../utils';
import type { LoginMethod } from '@/client/createSeamlessAuthClient';

import styles from '../styles/login.module.css';

interface AuthFallbackOptionsProps {
  identifier: string;
  onMagicLink: () => void;
  onEmailOtp?: () => void;
  onPhoneOtp: () => void;
  onPasskeyRetry?: () => void;
  loginMethods?: LoginMethod[];
}

const AuthFallbackOptions: React.FC<AuthFallbackOptionsProps> = ({
  identifier,
  onMagicLink,
  onEmailOtp,
  onPhoneOtp,
  onPasskeyRetry,
  loginMethods,
}) => {
  const allowedMethods = new Set<LoginMethod>(
    loginMethods ?? ['passkey', 'magic_link', 'phone_otp']
  );
  const showMagicLink = allowedMethods.has('magic_link') && isValidEmail(identifier);
  const showEmailOtp =
    allowedMethods.has('email_otp') && Boolean(onEmailOtp) && isValidEmail(identifier);
  const showPhoneOtp = allowedMethods.has('phone_otp') && isValidPhoneNumber(identifier);
  const showPasskeyRetry = allowedMethods.has('passkey') && Boolean(onPasskeyRetry);

  if (!showMagicLink && !showEmailOtp && !showPhoneOtp && !showPasskeyRetry) {
    return null;
  }

  return (
    <div className={styles.fallbackCard}>
      <div className={styles.fallbackHeader}>Choose a sign-in method</div>

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

        {showEmailOtp && (
          <button
            type="button"
            className={styles.fallbackActionButton}
            onClick={onEmailOtp}
          >
            <span className={styles.actionTitle}>Email Code</span>
            <span className={styles.actionSubtext}>
              Receive a one-time code by email
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

      {showPasskeyRetry && (
        <button type="button" className={styles.linkButton} onClick={onPasskeyRetry}>
          Try passkey anyway
        </button>
      )}
    </div>
  );
};

export default AuthFallbackOptions;
