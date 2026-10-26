/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { TOTP_CODE_LENGTH } from '@seamless-auth/client';
import React, { ReactNode, useState } from 'react';

import OtpInput from '@/components/OtpInput';
import recoveryStyles from '@/styles/recovery.module.css';
import styles from '@/styles/totp.module.css';

interface TotpCodeFormProps {
  submitLabel: string;
  busyLabel?: string;
  /** Resolves to an error message to show, or null once the code was accepted. */
  onSubmit: (code: string) => Promise<string | null>;
  buttonClassName?: string;
  children?: ReactNode;
}

/** A six-digit authenticator code entry. A refused code is cleared, since the next one the app shows is the one to try. */
const TotpCodeForm: React.FC<TotpCodeFormProps> = ({
  submitLabel,
  busyLabel = 'Checking...',
  onSubmit,
  buttonClassName = recoveryStyles.button,
  children,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    const message = await onSubmit(code);

    setBusy(false);

    if (message) {
      setError(message);
      setCode('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <OtpInput
        length={TOTP_CODE_LENGTH}
        value={code}
        onChange={setCode}
        name="totp"
        inputMode="numeric"
      />

      {error && (
        <p role="alert" className={recoveryStyles.error}>
          {error}
        </p>
      )}

      <button
        type="submit"
        className={buttonClassName}
        disabled={busy || code.length !== TOTP_CODE_LENGTH}
      >
        {busy ? busyLabel : submitLabel}
      </button>

      {children}
    </form>
  );
};

export default TotpCodeForm;
