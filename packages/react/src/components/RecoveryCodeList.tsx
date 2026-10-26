/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { recoveryCodesText } from '@seamless-auth/client';
import React, { useState } from 'react';

import styles from '@/styles/recovery.module.css';

interface RecoveryCodeListProps {
  codes: string[];
  /** Called once the user confirms they saved the codes. */
  onDone: () => void;
  doneLabel?: string;
}

/**
 * A freshly generated set, shown once. The server keeps only hashes, so the user
 * has to confirm they saved the codes before moving on.
 */
const RecoveryCodeList: React.FC<RecoveryCodeListProps> = ({
  codes,
  onDone,
  doneLabel = 'Continue',
}) => {
  const [saved, setSaved] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopyMessage('Copied to the clipboard.');
    } catch {
      setCopyMessage('Copying is not available here. Write the codes down instead.');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([recoveryCodesText(codes)], { type: 'text/plain' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p className={styles.description}>
        Save these codes somewhere safe, such as a password manager. Each one signs you in
        once if you lose your passkeys. You will not see them again.
      </p>

      <ul className={styles.codes} aria-label="Recovery codes">
        {codes.map(code => (
          <li key={code}>{code}</li>
        ))}
      </ul>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={copy}>
          Copy
        </button>
        <button type="button" className={styles.secondary} onClick={download}>
          Download
        </button>
      </div>
      {copyMessage && (
        <p role="status" className={styles.success}>
          {copyMessage}
        </p>
      )}

      <label className={styles.confirm}>
        <input
          type="checkbox"
          checked={saved}
          onChange={event => setSaved(event.target.checked)}
        />
        I have saved these recovery codes
      </label>

      <button type="button" className={styles.button} disabled={!saved} onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
};

export default RecoveryCodeList;
