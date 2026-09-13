/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Where a bearer-transport client keeps the session that outlives the process.
 *
 * Only the access and refresh tokens are stored. The ephemeral token of a
 * sign-in in flight stays in memory: persisting it would widen its exposure
 * without making any flow resumable, since the flow it belongs to is gone
 * once the process is.
 *
 * Every platform keystore is asynchronous, so the port is. Implementations
 * must not throw: a locked or unavailable keystore is a signed-out session,
 * not a failed request.
 */
export interface TokenStoragePort {
  get(): Promise<StoredTokens | null>;
  set(tokens: StoredTokens): Promise<void>;
  remove(): Promise<void>;
}

/** Holds the session for the life of the process only. */
export function createMemoryTokenStorage(): TokenStoragePort {
  let tokens: StoredTokens | null = null;

  return {
    async get() {
      return tokens;
    },
    async set(next) {
      tokens = next;
    },
    async remove() {
      tokens = null;
    },
  };
}
