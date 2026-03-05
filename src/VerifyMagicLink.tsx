import { useAuth } from '@/AuthProvider';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import styles from './styles/verifyOTP.module.css';
import { createFetchWithAuth } from './fetchWithAuth';
import LoadingSpinner from './LoadingSpinner';

const VerifyMagicLink: React.FC = () => {
  const { token } = useParams();
  const { apiHost, mode } = useAuth();

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchWithAuth = createFetchWithAuth({
    authMode: mode,
    authHost: apiHost,
  });

  useEffect(() => {
    // THIS should verify on load once and fail if not 200.
    // Offer redirection back to registration or login in that scenarion
    const verify = async () => {
      const response = await fetchWithAuth(`/magic-link/verify/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to verify token');
        setError('Failed to verify token');
      }

      setSuccessMsg(
        'Validation complete. You have been logged in on the screen that prompted this request.'
      );
    };
    if (token) {
      verify();
    }
  }, [token]);

  // TODO: Brandon will do the style updates here
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verifying your login</h1>

        {!error && !successMsg && <LoadingSpinner />}
        {error && <p className={styles.error}>{error}</p>}
        {successMsg && <p className={styles.success}>{successMsg}</p>}
      </div>
    </div>
  );
};

export default VerifyMagicLink;
