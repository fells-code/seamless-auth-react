import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '@/AuthProvider';
import PhoneInputWithCountryCode from '@/components/phoneInput';
import { useInternalAuth } from '@/context/InternalAuthContext';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './styles/login.module.css';
import { isPasskeySupported, isValidEmail, isValidPhoneNumber } from './utils';
import { createFetchWithAuth } from './fetchWithAuth';

function MagicLogin() {
  const navigate = useNavigate();
  const { apiHost, hasSignedInBefore, mode: authMode } = useAuth();

  // const { validateToken } = useInternalAuth();
  // const [identifier, setIdentifier] = useState<string>('');
  // const [email, setEmail] = useState<string>('');
  // const [mode, setMode] = useState<'login' | 'register'>('register');
  // const [phone, setPhone] = useState<string>('');
  // const [formErrors, setFormErrors] = useState<string>('');
  // const [phoneError, setPhoneError] = useState<string>('');
  // const [emailError, setEmailError] = useState<string>('');
  // const [identifierError, setIdentifierError] = useState<string>('');
  // const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const fetchWithAuth = createFetchWithAuth({
    authMode,
    authHost: apiHost,
  });
  useEffect(()=>{
    async function sendMagic(){
      await fetchWithAuth("/magic-link/", {method: 'POST'})
    }
    try {
      console.log("magic link use effect")
      sendMagic();
      console.log("after send magic")

    } catch (error) {
      //
      console.log(error)
    }
  },)
  async function getMagicLink(): Promise<void> {
    try {
      const magicLinkResponse = await fetchWithAuth('/auth/magic-link', {
        method: 'POST',
      });

      if (!magicLinkResponse.ok) {
        console.log('Failed to create magic link');
      }
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.inputGroup}>

        <label className={styles.label}>
          A confirmation link has been sent to your email, please check your email.
        </label>
        </div>

        <>
          <form >
            {(
              <div className={styles.inputGroup}>
                <label htmlFor="identifier" className={styles.label}>
                  Please click <a>here</a> to send another email.
                </label>

                {/* {identifierError && <p className={styles.error}>{identifierError}</p>} */}
              </div>
            )}




            {/* {formErrors && <p className={styles.error}>{formErrors}</p>} */}


          </form>
        </>
      </div>
    </div>
  );
}

export default MagicLogin;
