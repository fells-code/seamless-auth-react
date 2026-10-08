/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import React from 'react';
import {
  fallbackSignInOptions,
  hasFallbackSignInOption,
  type LoginMethod,
} from '@seamless-auth/client';

import styles from '../styles/login.module.css';

interface AuthFallbackOptionsProps {
  identifier: string;
  onMagicLink: () => void;
  onEmailOtp?: () => void;
  onPhoneOtp: () => void;
  onPasskeyRetry?: () => void;
  loginMethods?: LoginMethod[] | null;
}

const AuthFallbackOptions: React.FC<AuthFallbackOptionsProps> = ({
  identifier,
  onMagicLink,
  onEmailOtp,
  onPhoneOtp,
  onPasskeyRetry,
  loginMethods,
}) => {
  const options = fallbackSignInOptions(identifier, loginMethods, {
    emailOtp: Boolean(onEmailOtp),
    passkeyRetry: Boolean(onPasskeyRetry),
  });

  if (!hasFallbackSignInOption(options)) {
    return null;
  }

  return (
    <div className={styles.fallbackCard}>
      <div className={styles.fallbackHeader}>Choose a sign-in method</div>

      <p className={styles.fallbackDescription}>Choose another secure sign-in method.</p>

      <div className={styles.fallbackActions}>
        {options.magicLink && (
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

        {options.emailOtp && (
          <button
            type="button"
            className={styles.fallbackActionButton}
            onClick={onEmailOtp}
          >
            <span className={styles.actionTitle}>Email Code</span>
            <span className={styles.actionSubtext}>Receive a one-time code by email</span>
          </button>
        )}

        {options.phoneOtp && (
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

      {options.passkeyRetry && (
        <button type="button" className={styles.linkButton} onClick={onPasskeyRetry}>
          Try passkey anyway
        </button>
      )}
    </div>
  );
};

export default AuthFallbackOptions;
