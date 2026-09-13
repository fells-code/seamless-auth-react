/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { StoredTokens, TokenStoragePort } from '@seamless-auth/client';

/**
 * The part of `expo-secure-store` this port uses. The module is passed in
 * rather than imported, so an application that does not install it never has
 * Metro fail the bundle on a module this package would otherwise require.
 */
export interface SecureStoreLike {
  getItemAsync(key: string, options?: unknown): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: unknown): Promise<void>;
  deleteItemAsync(key: string, options?: unknown): Promise<void>;
}

export interface SecureStoreTokenStorageOptions {
  /** Keystore entry name. Defaults to `seamless-auth.session`. */
  key?: string;
  /** Passed through to every `expo-secure-store` call, for `keychainAccessible` and the like. */
  storeOptions?: unknown;
}

const DEFAULT_KEY = 'seamless-auth.session';

/**
 * A bearer session in the platform keystore (Keychain on iOS, Keystore-backed
 * encrypted storage on Android) through `expo-secure-store`.
 *
 * Never throws. A keystore that is locked, missing, or holding something that
 * does not parse reads as no session, which signs the user out rather than
 * breaking every request.
 *
 * ```ts
 * import * as SecureStore from 'expo-secure-store';
 * const tokenStorage = createSecureStoreTokenStorage(SecureStore);
 * ```
 */
export function createSecureStoreTokenStorage(
  store: SecureStoreLike,
  options: SecureStoreTokenStorageOptions = {}
): TokenStoragePort {
  const key = options.key ?? DEFAULT_KEY;

  return {
    async get() {
      try {
        const raw = await store.getItemAsync(key, options.storeOptions);
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof (parsed as StoredTokens).accessToken === 'string' &&
          typeof (parsed as StoredTokens).refreshToken === 'string'
        ) {
          const { accessToken, refreshToken } = parsed as StoredTokens;
          return { accessToken, refreshToken };
        }
        return null;
      } catch {
        return null;
      }
    },

    async set(tokens) {
      try {
        await store.setItemAsync(
          key,
          JSON.stringify({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          }),
          options.storeOptions
        );
      } catch {
        // A keystore that refuses the write leaves the session in memory for
        // this process only. The next launch starts signed out.
      }
    },

    async remove() {
      try {
        await store.deleteItemAsync(key, options.storeOptions);
      } catch {
        // Nothing to do: the entry is either gone or was never written.
      }
    },
  };
}
