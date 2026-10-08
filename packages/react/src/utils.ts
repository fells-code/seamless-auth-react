/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { isPlatformAuthenticatorAvailable } from '@seamless-auth/client';

// The validators and user agent parsing live in the client so every binding
// shares them. Re-exported here for the screens and existing imports.
export { isValidEmail, isValidPhoneNumber, parseUserAgent } from '@seamless-auth/client';

/**
 * Check for Passkey support
 * @returns {boolean} - If the current context supports passkeys
 */
export async function isPasskeySupported(): Promise<boolean> {
  return isPlatformAuthenticatorAvailable();
}
