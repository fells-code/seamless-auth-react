/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { useAuth } from '@/AuthProvider';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from '@/styles/passKeyLogin.module.css';

const PassKeyLogin: React.FC = () => {
  const navigate = useNavigate();
  const { handlePasskeyLogin: runPasskeyLogin } = useAuth();
  const [error, setError] = useState('');

  const handlePasskeyLoginClick = async () => {
    setError('');

    const success = await runPasskeyLogin();

    if (success) {
      navigate('/');
      return;
    }

    setError('Passkey sign-in could not be completed. Try another sign-in method.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Login with Passkey</h2>
        <button onClick={handlePasskeyLoginClick} className={styles.button}>
          Use Passkey
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
};

export default PassKeyLogin;
