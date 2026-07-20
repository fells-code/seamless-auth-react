/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { SeamlessAuthError, toSeamlessAuthError } from './errors';

/**
 * Outcome of an auth request.
 *
 * Auth failures are expected outcomes rather than exceptions: a wrong OTP, an
 * expired magic link, or a disabled provider all map directly to UI state. So
 * requests resolve to a result instead of throwing, and `data` is only readable
 * once `error` has been checked.
 *
 * ```ts
 * const { data, error } = await authClient.getCurrentUser();
 * if (error) {
 *   setMessage(error.message);
 *   return;
 * }
 * setUser(data.user);
 * ```
 */
export type SeamlessAuthResult<T> =
  | { data: T; error: null }
  | { data: null; error: SeamlessAuthError };

/** Status used when the request never reached the server. */
export const NETWORK_ERROR_STATUS = 0;

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    // A successful response is allowed to carry no body, for example a delete.
    return undefined;
  }
}

/**
 * Run a request and convert it into a result. Never throws for HTTP outcomes,
 * and also absorbs transport failures so callers only handle one shape.
 */
export async function requestResult<T>(
  request: Promise<Response>,
  fallbackMessage: string
): Promise<SeamlessAuthResult<T>> {
  let response: Response;

  try {
    response = await request;
  } catch {
    return {
      data: null,
      error: new SeamlessAuthError(fallbackMessage, NETWORK_ERROR_STATUS),
    };
  }

  if (!response.ok) {
    return { data: null, error: await toSeamlessAuthError(response, fallbackMessage) };
  }

  return { data: (await readBody(response)) as T, error: null };
}

/** Wrap an already-derived value as a successful result. */
export function resultOf<T>(data: T): SeamlessAuthResult<T> {
  return { data, error: null };
}

/** Wrap a failure as a result. */
export function resultError<T>(
  message: string,
  status = NETWORK_ERROR_STATUS,
  body?: unknown
): SeamlessAuthResult<T> {
  return { data: null, error: new SeamlessAuthError(message, status, body) };
}
