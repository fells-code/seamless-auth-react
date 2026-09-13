/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnAvailable,
} from '../client/webauthnSupport';
import type { PasskeyPort } from './passkeys';

/**
 * The browser's passkey ceremonies, over SimpleWebAuthn. This is the default
 * port, so a web application configures nothing.
 */
export function createBrowserPasskeyPort(): PasskeyPort {
  return {
    isSupported: () => isWebAuthnAvailable(),
    isPlatformAuthenticatorAvailable,
    create: optionsJSON => startRegistration({ optionsJSON }),
    get: optionsJSON => startAuthentication({ optionsJSON }),
  };
}
