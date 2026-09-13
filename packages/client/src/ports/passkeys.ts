/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';

/**
 * The passkey ceremonies, as the platform runs them.
 *
 * The auth API speaks WebAuthn JSON on both sides of a ceremony, so the only
 * thing that differs between a browser and a native app is who prompts the
 * user. A binding supplies this and the client keeps the flow logic.
 */
export interface PasskeyPort {
  /** Whether this platform can run WebAuthn ceremonies at all. */
  isSupported(): boolean;
  /**
   * Whether a user-verifying platform authenticator (Touch ID, Face ID,
   * Windows Hello, Android biometrics) is available for a new credential.
   */
  isPlatformAuthenticatorAvailable(): Promise<boolean>;
  create(
    optionsJSON: PublicKeyCredentialCreationOptionsJSON
  ): Promise<RegistrationResponseJSON>;
  get(
    optionsJSON: PublicKeyCredentialRequestOptionsJSON
  ): Promise<AuthenticationResponseJSON>;
}

/**
 * What a port throws when the authenticator itself refuses or fails, as
 * opposed to a network or programming error. `name` is the DOMException name
 * (`NotAllowedError`, `InvalidStateError`, `SecurityError`), which is what the
 * error readers and the built-in screens key off; `code` is a finer reason
 * when the platform offers one.
 */
export class PasskeyCeremonyError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(name: string, message: string, code = name, cause?: unknown) {
    super(message);
    this.name = name;
    this.code = code;
    this.cause = cause;
  }
}

/**
 * True for a `PasskeyCeremonyError` and for the shape SimpleWebAuthn's own
 * `WebAuthnError` has (a DOMException `name` plus a string `code`), so the
 * browser port can pass the library's errors through unchanged.
 */
export function isPasskeyCeremonyError(
  error: unknown
): error is Error & { code: string } {
  return (
    error instanceof Error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    error.name !== 'Error'
  );
}
