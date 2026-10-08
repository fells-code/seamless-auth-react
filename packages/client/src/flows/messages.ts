/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  getOAuthErrorCode,
  getPasskeyPolicyErrorCode,
  isUnauthenticated,
} from '../client/errors';
import type { OAuthErrorCode, PasskeyPolicyErrorCode } from '../client/errors';

/**
 * Copy the bundled screens of every binding show, kept here so the bindings say
 * the same thing for the same failure.
 */
export const OAUTH_ERROR_MESSAGES: Record<OAuthErrorCode, string> = {
  oauth_missing_email:
    'Your provider account did not share an email address. Add an email to that account and make it visible, then try again.',
  oauth_email_not_verified:
    'The email address on your provider account is not verified. Verify it with your provider, then try again.',
  oauth_missing_subject:
    'Your provider did not return a usable account identifier. Try again, or sign in with a different method.',
  oauth_invalid_id_token:
    'Your provider sent a sign-in response that could not be verified. Try again, or sign in with a different method.',
  oauth_provider_retired:
    'Your organization no longer signs in with this provider. Sign in with your passkey or another method instead.',
};

export const OAUTH_GENERIC_ERROR = 'We could not complete sign-in. Please try again.';

export function oauthErrorMessage(error: unknown): string {
  const code = getOAuthErrorCode(error);

  return code ? OAUTH_ERROR_MESSAGES[code] : OAUTH_GENERIC_ERROR;
}

export const PASSKEY_POLICY_MESSAGES: Record<PasskeyPolicyErrorCode, string> = {
  attachment_not_allowed:
    'This application does not accept that kind of authenticator. Try the other option.',
  synced_passkey_not_allowed:
    'This passkey syncs to a password manager, and this application requires one that stays on a single device, such as a security key.',
  authenticator_not_allowed: 'This application does not accept this authenticator.',
  prf_required:
    'This authenticator does not support a feature this application requires.',
};

/**
 * What to tell someone whose passkey enrolment failed.
 *
 * A policy refusal names something the user can act on, for example reaching
 * for a security key instead. A 401 is the session, not the authenticator:
 * enrolment takes the signed-in one, so the answer is to sign in again rather
 * than to try a different key. Anything else stays generic.
 */
export function passkeyRegistrationErrorMessage(error: unknown): string {
  const code = getPasskeyPolicyErrorCode(error);

  if (code) return PASSKEY_POLICY_MESSAGES[code];

  return isUnauthenticated(error)
    ? 'Your session expired before the passkey was saved. Sign in again to add one.'
    : 'Error registering passkey.';
}
