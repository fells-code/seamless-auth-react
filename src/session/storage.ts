/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * The session store's only browser dependency, expressed as a port so the store
 * itself stays framework and environment agnostic. Implementations never throw:
 * private browsing and disabled storage are normal, and neither is a reason to
 * fail an auth flow.
 */
export interface SessionStoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function createMemoryStorage(): SessionStoragePort {
  const values = new Map<string, string>();

  return {
    get: key => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value);
    },
  };
}

export function createBrowserStorage(): SessionStoragePort {
  return {
    get: key => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage can be unavailable, for example in private mode.
      }
    },
  };
}

/**
 * Browser storage where there is a `localStorage`, memory otherwise. The memory
 * fallback is what keeps the store usable during server-side rendering.
 */
export function createDefaultStorage(): SessionStoragePort {
  return typeof localStorage === 'undefined'
    ? createMemoryStorage()
    : createBrowserStorage();
}
