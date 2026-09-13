/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  PasskeyCeremonyError,
  type AuthenticationResponseJSON,
  type PasskeyPort,
  type RegistrationResponseJSON,
} from '@seamless-auth/client';

/**
 * The part of `react-native-passkeys` this port uses. Passed in rather than
 * imported, for the same reason as the secure store: the library is a native
 * module the application chooses to install.
 *
 * The request and response shapes are the WebAuthn JSON the auth API speaks,
 * but the library declares its own copies of those types, so they are generic
 * here and cast once at the seam rather than fought over.
 */
export interface NativePasskeysLike<CreateRequest = unknown, GetRequest = unknown> {
  isSupported(): boolean;
  create(request: CreateRequest): Promise<unknown>;
  get(request: GetRequest): Promise<unknown>;
}

/**
 * Maps what the native library throws onto the DOMException names the client
 * and its error readers already understand. The library surfaces the
 * platform's own error codes; the ones that mean "the user did not complete
 * it" become `NotAllowedError`, a duplicate becomes `InvalidStateError`, and
 * anything else keeps its own name so it stays diagnosable.
 */
function toCeremonyError(thrown: unknown): PasskeyCeremonyError {
  const error = thrown as { name?: unknown; code?: unknown; message?: unknown } | null;
  const code = typeof error?.code === 'string' ? error.code : undefined;
  const rawName = typeof error?.name === 'string' ? error.name : 'UnknownError';
  const message =
    typeof error?.message === 'string' ? error.message : 'Passkey ceremony failed.';

  const cancelled = /cancel|abort|dismiss|NotAllowed|UserCancelled|1001/i;
  const duplicate = /InvalidState|exists|excluded|already/i;

  const name = cancelled.test(`${rawName} ${code ?? ''} ${message}`)
    ? 'NotAllowedError'
    : duplicate.test(`${rawName} ${code ?? ''} ${message}`)
      ? 'InvalidStateError'
      : rawName;

  return new PasskeyCeremonyError(name, message, code ?? name, thrown);
}

/**
 * Passkeys through the platform's native APIs (ASAuthorization on iOS,
 * Credential Manager on Android) via `react-native-passkeys`.
 *
 * The relying party must be an associated domain of the app. There is no
 * `localhost` exemption on either platform, so this works only against a
 * hosted `apple-app-site-association` and `assetlinks.json`.
 *
 * ```ts
 * import * as Passkeys from 'react-native-passkeys';
 * const passkeys = createNativePasskeyPort(Passkeys);
 * ```
 */
export function createNativePasskeyPort<CreateRequest, GetRequest>(
  native: NativePasskeysLike<CreateRequest, GetRequest>
): PasskeyPort {
  return {
    isSupported: () => native.isSupported(),

    // A mobile platform that supports passkeys at all has a platform
    // authenticator: that is what the biometric prompt is.
    isPlatformAuthenticatorAvailable: async () => native.isSupported(),

    async create(optionsJSON) {
      let result: RegistrationResponseJSON | null;
      try {
        result = (await native.create(
          optionsJSON as unknown as CreateRequest
        )) as RegistrationResponseJSON | null;
      } catch (error) {
        throw toCeremonyError(error);
      }
      if (!result) {
        throw new PasskeyCeremonyError(
          'NotAllowedError',
          'Passkey registration was cancelled.'
        );
      }
      return result;
    },

    async get(optionsJSON) {
      let result: AuthenticationResponseJSON | null;
      try {
        result = (await native.get(
          optionsJSON as unknown as GetRequest
        )) as AuthenticationResponseJSON | null;
      } catch (error) {
        throw toCeremonyError(error);
      }
      if (!result) {
        throw new PasskeyCeremonyError(
          'NotAllowedError',
          'Passkey sign-in was cancelled.'
        );
      }
      return result;
    },
  };
}
