import parsePhoneNumberFromString from "libphonenumber-js";
import validator from "validator";

/**
 * isValidEmail
 *
 * Determine if the given string is a valid phone number or not
 * @param email An email to validate
 * @returns boolean - Is the email valid or not
 */
export const isValidEmail = (email: string): boolean => {
  return validator.isEmail(email);
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
    typeof window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable === "function"
  ) {
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error("Error checking passkey support:", error);
      return false;
    }
  }
  return false;
}
