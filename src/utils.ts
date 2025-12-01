import parsePhoneNumberFromString from 'libphonenumber-js';

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
