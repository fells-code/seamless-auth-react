/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

/**
 * True when the browser exposes a usable WebAuthn API in a secure context.
 * This is the coarse gate for any passkey flow, including PRF assertions.
 */
export function isWebAuthnAvailable(): boolean {
  if (!browserSupportsWebAuthn()) {
    return false;
  }

  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return false;
  }

  return (
    typeof globalThis.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.credentials?.get === 'function'
  );
}

/**
 * True when a user-verifying platform authenticator (Touch ID, Windows Hello,
 * and similar) can be used on this device.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      'function'
  ) {
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      console.error('Error checking passkey support.');
      return false;
    }
  }

  return false;
}
