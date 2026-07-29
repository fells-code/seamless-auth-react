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
  /**
   * The underlying failure when the error was raised locally rather than by a
   * response, for example the `DOMException` a WebAuthn ceremony throws.
   */
  readonly cause: unknown;

  constructor(message: string, status: number, body?: unknown, cause?: unknown) {
    super(message);
    this.name = 'SeamlessAuthError';
    this.status = status;
    this.body = body;
    this.cause = cause;
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

/**
 * Detail recovered from a failed WebAuthn ceremony.
 *
 * `name` is the `DOMException` name, which is what distinguishes the cases a
 * user can act on: `NotAllowedError` for a dismissed prompt or no usable
 * credential, `SecurityError` for an origin or RP ID mismatch,
 * `InvalidStateError` for an already registered passkey. `code` is
 * SimpleWebAuthn's narrower reason when it identified one, for example
 * `ERROR_CEREMONY_ABORTED`.
 */
export type WebAuthnErrorDetail = {
  name: string;
  code?: string;
  message: string;
};

function isErrorLike(
  value: unknown
): value is { name: string; message?: unknown; code?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

/**
 * Read the WebAuthn failure behind a result error. Returns `undefined` for
 * errors that did not come from a ceremony, so callers can branch on the
 * specific failure and otherwise fall back to `error.message`.
 */
export function getWebAuthnErrorDetail(error: unknown): WebAuthnErrorDetail | undefined {
  if (!(error instanceof SeamlessAuthError) || !isErrorLike(error.cause)) {
    return undefined;
  }

  const { name, code, message } = error.cause;

  return {
    name,
    code: typeof code === 'string' ? code : undefined,
    message: typeof message === 'string' ? message : '',
  };
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
