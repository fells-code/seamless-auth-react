/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { SeamlessAuthClient } from '../client/createSeamlessAuthClient';
import { SeamlessAuthError } from '../client/errors';
import type { AuthSessionActions } from '../session/createAuthSession';

export const TOTP_CODE_LENGTH = 6;

export const TOTP_GENERIC_ERROR = 'Something went wrong. Please try again.';

function errorCode(error: SeamlessAuthError): string | undefined {
  const code = (error.body as { error?: unknown } | null | undefined)?.error;
  return typeof code === 'string' ? code : undefined;
}

function retryAfterSeconds(error: SeamlessAuthError): number | undefined {
  const value = (error.body as { retryAfterSeconds?: unknown } | null | undefined)
    ?.retryAfterSeconds;
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/**
 * What to tell someone whose authenticator code was refused.
 *
 * A wrong code and one already used answer the same, because the API does not
 * say which: a code is accepted once, so the next one the app shows is the fix
 * for both.
 */
export function totpErrorMessage(
  error: unknown,
  fallback: string = TOTP_GENERIC_ERROR
): string {
  if (!(error instanceof SeamlessAuthError)) return fallback;

  const code = errorCode(error);

  if (code === 'totp_verification_failed' || code === 'totp_disable_failed') {
    return 'That code did not work. Enter the current code from your authenticator app. Each code works once.';
  }

  if (error.status === 423 || code === 'account_locked') {
    const seconds = retryAfterSeconds(error);
    if (!seconds) return 'Too many failed attempts. Try again later.';
    const minutes = Math.ceil(seconds / 60);
    return `Too many failed attempts. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
  }

  if (error.status === 429) {
    return 'Too many attempts. Wait a moment, then try again.';
  }

  if (code === 'login_method_disabled') {
    return 'This account signs in with a passkey. Use your passkey instead.';
  }

  if (code === 'secret_required') {
    return 'Authenticator apps are not available for this application yet.';
  }

  return fallback;
}

/** The secret in groups of four, which is easier to type into an app by hand. */
export function formatTotpSecret(secret: string): string {
  return (
    secret
      .replace(/\s+/g, '')
      .match(/.{1,4}/g)
      ?.join(' ') ?? ''
  );
}

/** Signs in with an authenticator code on the sign-in `login()` started. */
export async function signInWithTotp(
  deps: {
    client: Pick<SeamlessAuthClient, 'verifyTotpLogin'>;
    refreshSession: AuthSessionActions['refreshSession'];
  },
  code: string
): Promise<{ error: null } | { error: string }> {
  const trimmed = code.replace(/\s+/g, '');

  if (!new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`).test(trimmed)) {
    return {
      error: `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`,
    };
  }

  const { error } = await deps.client.verifyTotpLogin(trimmed);

  if (error) {
    return {
      error: totpErrorMessage(error, 'We could not sign you in with that code.'),
    };
  }

  await deps.refreshSession();
  return { error: null };
}
