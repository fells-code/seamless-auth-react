/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * Error carrying the auth server's response detail, so callers can map known
 * failures to their own messaging instead of only seeing a generic string.
 */
export class SeamlessAuthError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'SeamlessAuthError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Machine-readable codes the auth API returns alongside `error` on an OAuth
 * callback failure the user can act on.
 */
export type OAuthErrorCode =
  | 'oauth_missing_email'
  | 'oauth_email_not_verified'
  | 'oauth_missing_subject';

const OAUTH_ERROR_CODES = new Set<string>([
  'oauth_missing_email',
  'oauth_email_not_verified',
  'oauth_missing_subject',
]);

/**
 * Read the OAuth failure code off a result error. Returns `undefined` for
 * anything unrecognized, including codes added by a newer API, so callers keep
 * their generic messaging instead of showing a raw code.
 */
export function getOAuthErrorCode(error: unknown): OAuthErrorCode | undefined {
  if (!(error instanceof SeamlessAuthError)) {
    return undefined;
  }

  if (typeof error.body !== 'object' || error.body === null) {
    return undefined;
  }

  const { code } = error.body as { code?: unknown };

  return typeof code === 'string' && OAUTH_ERROR_CODES.has(code)
    ? (code as OAuthErrorCode)
    : undefined;
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  // The auth API reports failures as `{ error: string }`. `message` is accepted
  // too so a differently shaped payload still produces a useful message.
  const { error, message } = body as { error?: unknown; message?: unknown };

  if (typeof error === 'string' && error) {
    return error;
  }

  return typeof message === 'string' && message ? message : undefined;
}

/**
 * Build a `SeamlessAuthError` from a failed response, preserving the status and
 * the parsed body. The body may be empty or non-JSON, which is not treated as a
 * failure: the fallback message is used instead.
 */
export async function toSeamlessAuthError(
  response: Response,
  fallbackMessage: string
): Promise<SeamlessAuthError> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  return new SeamlessAuthError(
    extractMessage(body) ?? fallbackMessage,
    response.status,
    body
  );
}
