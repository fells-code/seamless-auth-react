import parsePhoneNumberFromString from 'libphonenumber-js';
import { startAuthentication } from '@simplewebauthn/browser';
import { createFetchWithAuth } from './fetchWithAuth';
/**
 * isValidEmail
 *
 * Determine if value is a valid email
 *
 * @param email - The email address to validate
 * @returns boolean - Whether the email is syntactically valid
 */
export const isValidEmail = (email: string): boolean => {
  if (typeof email !== 'string') return false;

  // Trim and normalize
  const normalized = email.trim();

  // Basic sanity checks
  if (normalized.length < 3 || normalized.length > 320) return false;

  // Split into local part and domain part
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;

  // Validate local part (before @)
  if (
    !/^[A-Za-z0-9._%+-]+$/.test(localPart) ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..')
  ) {
    return false;
  }

  // Validate domain part (after @)
  if (
    !/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domainPart) ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-') ||
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.includes('..')
  ) {
    return false;
  }

  return true;
};

/**
 * isValidPhoneNumber
 *
 * Determine if the given string is a valid phone number or not
 * @param phone A phone number
 * @returns {boolean} - Is the phone number valid or not
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneNumber = parsePhoneNumberFromString(phone);
  return phoneNumber?.isValid() || false;
};

/**
 * Check for Passkey support
 * @returns {boolean} - If the current context supports passkeys
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      'function'
  ) {
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error('Error checking passkey support:', error);
      return false;
    }
  }
  return false;
}

export function parseUserAgent() {
  const ua = navigator.userAgent.toLowerCase();

  let platform = 'unknown';
  let browser = 'unknown';

  if (/iphone|ipad|ipod/.test(ua)) platform = 'ios';
  else if (/android/.test(ua)) platform = 'android';
  else if (/mac os/.test(ua)) platform = 'mac';
  else if (/windows/.test(ua)) platform = 'windows';
  else if (/linux/.test(ua)) platform = 'linux';

  if (/chrome/.test(ua)) browser = 'chrome';
  if (/safari/.test(ua) && !/chrome/.test(ua)) browser = 'safari';
  if (/firefox/.test(ua)) browser = 'firefox';
  if (/edg/.test(ua)) browser = 'edge';

  const deviceInfo = `${platform} • ${browser}`;

  return { platform, browser, deviceInfo };
}

export const login = async (
  fetchWithAuth: (input: string, init?: RequestInit) => Promise<Response>,
  identifier: string,
  passkeyAvailable: boolean
) => {
  // setFormErrors('');

  const response = await fetchWithAuth(`/login`, {
    method: 'POST',
    body: JSON.stringify({ identifier, passkeyAvailable }),
  });

  // if (!response.ok) {
  //   setFormErrors('Failed to send login link. Please try again.');
  //   return;
  // }

  // if (!passkeyAvailable) {
  //   setShowFallbackOptions(true);
  //   return;
  // }

  try {
    await handlePasskeyLogin(fetchWithAuth);
  } catch (err) {
    console.error('Passkey login failed', err);
    // setShowFallbackOptions(true);
  }
};

const handlePasskeyLogin = async (
  fetchWithAuth: (input: string, init?: RequestInit) => Promise<Response>
) => {
  try {
    const response = await fetchWithAuth(`/webAuthn/login/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      console.error('Something went wrong getting webauthn options');
      return;
    }

    const options = await response.json();
    const credential = await startAuthentication({ optionsJSON: options });

    const verificationResponse = await fetchWithAuth(`/webAuthn/login/finish`, {
      method: 'POST',
      body: JSON.stringify({ assertionResponse: credential }),
    });

    if (!verificationResponse.ok) {
      console.error('Failed to verify passkey');
    }

    const verificationResult = await verificationResponse.json();

    // let them handle the below
    // if (verificationResult.message === 'Success') {
    //   if (verificationResult.mfaLogin) {
    //     navigate('/mfaLogin');
    //     return;
    //   }
    //   await validateToken();
    //   navigate('/');
    //   return;
    // } else {
    //   console.error('Passkey login failed:', verificationResult.message);
    // }
  } catch (error) {
    console.error('Passkey login error:', error);
  }
};
