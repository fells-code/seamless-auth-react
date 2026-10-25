/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type {
  OAuthErrorCode as OAuthErrorCodeShape,
  WebAuthnErrorCode as WebAuthnErrorCodeShape,
} from '@seamless-auth/types';

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
export type OAuthErrorCode = OAuthErrorCodeShape;

/*
 * The upstream package exports a runtime list of these codes too, but importing
 * it would pull Zod into the browser bundle for what is a membership test. This
 * is the type-only equivalent: `Record<OAuthErrorCode, true>` fails to compile
 * if the upstream union gains or loses a member, so it cannot drift silently.
 */
const OAUTH_ERROR_CODES: Record<OAuthErrorCode, true> = {
  oauth_missing_email: true,
  oauth_email_not_verified: true,
  oauth_missing_subject: true,
  oauth_invalid_id_token: true,
  oauth_provider_retired: true,
};

function readCode(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  return (body as { code?: unknown }).code;
}

/**
 * Read the OAuth failure code off a result error. Returns `undefined` for
 * anything unrecognized, including codes added by a newer API, so callers keep
 * their generic messaging instead of showing a raw code.
 *
 * The auth API puts `code` at the top level of the error body, but a proxy in
 * front of it may normalize that body and nest the siblings of `error` under
 * `details`. Both locations are accepted so such a proxy does not silently
 * downgrade OAuth messaging to a generic failure.
 */
export function getOAuthErrorCode(error: unknown): OAuthErrorCode | undefined {
  if (!(error instanceof SeamlessAuthError)) {
    return undefined;
  }

  if (typeof error.body !== 'object' || error.body === null) {
    return undefined;
  }

  const code =
    readCode(error.body) ?? readCode((error.body as { details?: unknown }).details);

  return typeof code === 'string' &&
    Object.prototype.hasOwnProperty.call(OAUTH_ERROR_CODES, code)
    ? (code as OAuthErrorCode)
    : undefined;
}

/**
 * Machine-readable codes registration is refused with when a deployment will not
 * enrol the authenticator on policy grounds.
 *
 * `attachment_not_allowed` comes from register/start with a `400`, before any
 * ceremony runs. The rest come from register/finish with a `403`, once the
 * credential exists and can be inspected.
 */
export type PasskeyPolicyErrorCode = Exclude<
  WebAuthnErrorCodeShape,
  'prf_output_not_allowed'
>;

/*
 * `WebAuthnErrorCode` covers every WebAuthn code the API sends, across all of
 * its operations, so it is narrowed rather than used whole. The one it leaves
 * out, `prf_output_not_allowed`, is a `400` from login and step-up finish, and
 * it reports a client that failed to strip PRF output rather than a deployment
 * refusing an authenticator. Reporting it as a policy refusal would point an
 * integrator at their configuration for what is a bug in the caller.
 *
 * Subtracting that one name, rather than listing the four that are wanted, is
 * what makes upstream additions visible: a code added to `WebAuthnErrorCode`
 * lands in this type, and the `Record` below then fails to compile until it is
 * either handled here or excluded on purpose. Listing the wanted names instead
 * would silently ignore it. As with the OAuth codes, the runtime list stays out
 * of the browser bundle so Zod does not come with it.
 */
const PASSKEY_POLICY_ERROR_CODES: Record<PasskeyPolicyErrorCode, true> = {
  attachment_not_allowed: true,
  synced_passkey_not_allowed: true,
  authenticator_not_allowed: true,
  prf_required: true,
};

function readPolicyCode(body: unknown): PasskeyPolicyErrorCode | undefined {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  const code = (body as { error?: unknown }).error;

  return typeof code === 'string' &&
    Object.prototype.hasOwnProperty.call(PASSKEY_POLICY_ERROR_CODES, code)
    ? (code as PasskeyPolicyErrorCode)
    : undefined;
}

/**
 * Read the passkey policy refusal off a registration error, from either stage of
 * the ceremony. Returns `undefined` for anything unrecognized, including codes
 * added by a newer API, so callers keep their generic messaging instead of
 * showing a raw code.
 *
 * The auth API sends the code as the whole of `error`, which is also what
 * becomes `error.message`. A proxy in front of it may instead derive a
 * human-readable `error` and keep the upstream body under `details`, so an
 * unrecognized top-level value falls through to the nested one rather than
 * ending the lookup.
 */
export function getPasskeyPolicyErrorCode(
  error: unknown
): PasskeyPolicyErrorCode | undefined {
  if (!(error instanceof SeamlessAuthError)) {
    return undefined;
  }

  if (typeof error.body !== 'object' || error.body === null) {
    return undefined;
  }

  return (
    readPolicyCode(error.body) ??
    readPolicyCode((error.body as { details?: unknown }).details)
  );
}

/**
 * Whether a failure means nobody is signed in.
 *
 * Enrollment takes the signed-in session, so a `401` there is an expired or missing
 * one rather than anything about the authenticator, and the two need different
 * messages: one asks the user to sign in again, the other to reach for a different
 * key. Raised locally, a ceremony failure carries `NETWORK_ERROR_STATUS`, so this
 * matches on the response status alone.
 */
export function isUnauthenticated(error: unknown): boolean {
  return error instanceof SeamlessAuthError && error.status === 401;
}

function topLevelError(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  const code = (body as { error?: unknown }).error;
  return typeof code === 'string' ? code : undefined;
}

/**
 * The machine codes on an error body: the API's own `error`, then the one a proxy
 * that rewrites `error` into a sentence keeps under `details`.
 */
function errorCodesOf(body: unknown): string[] {
  const nested =
    typeof body === 'object' && body !== null
      ? topLevelError((body as { details?: unknown }).details)
      : undefined;

  return [topLevelError(body), nested].filter(
    (code): code is string => code !== undefined
  );
}

function hasErrorCode(error: unknown, status: number, code: string): boolean {
  return (
    error instanceof SeamlessAuthError &&
    error.status === status &&
    errorCodesOf(error.body).includes(code)
  );
}

/**
 * Whether a request was refused for want of a fresh step-up, for example replacing
 * an existing set of recovery codes. Verify with `verifyStepUpWithPasskey()` (or
 * TOTP) and send the request again.
 */
export function isStepUpRequired(error: unknown): boolean {
  return hasErrorCode(error, 403, 'step_up_required');
}

/**
 * Whether a request was refused because the session is a recovery session that
 * has not enrolled a new passkey or authenticator app yet.
 */
export function isEnrollmentRequired(error: unknown): boolean {
  return hasErrorCode(error, 403, 'enrollment_required');
}

/**
 * Machine codes the recovery code and account recovery routes answer with. Local
 * until `@seamless-auth/types` publishes them.
 */
export type RecoveryErrorCode =
  | 'invalid_recovery_code'
  | 'recovery_codes_disabled'
  | 'account_recovery_disabled'
  | 'recovery_notice_failed'
  | 'recovery_not_found'
  | 'recovery_not_ready'
  | 'cancel_token_required';

const RECOVERY_ERROR_CODES: Record<RecoveryErrorCode, true> = {
  invalid_recovery_code: true,
  recovery_codes_disabled: true,
  account_recovery_disabled: true,
  recovery_notice_failed: true,
  recovery_not_found: true,
  recovery_not_ready: true,
  cancel_token_required: true,
};

/**
 * Read the recovery failure code off a result error. Returns `undefined` for
 * anything unrecognized, so callers keep their generic messaging.
 */
export function getRecoveryErrorCode(error: unknown): RecoveryErrorCode | undefined {
  if (!(error instanceof SeamlessAuthError)) {
    return undefined;
  }

  return errorCodesOf(error.body).find(code =>
    Object.prototype.hasOwnProperty.call(RECOVERY_ERROR_CODES, code)
  ) as RecoveryErrorCode | undefined;
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
