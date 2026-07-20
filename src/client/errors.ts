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
