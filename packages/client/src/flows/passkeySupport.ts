/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { PasskeyPort } from '../ports/passkeys';

/**
 * Whether this device can enrol and use a passkey: WebAuthn is available and a
 * user-verifying platform authenticator is present. Never rejects.
 */
export async function detectPasskeySupport(passkeys: PasskeyPort): Promise<boolean> {
  try {
    return passkeys.isSupported() && (await passkeys.isPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}
