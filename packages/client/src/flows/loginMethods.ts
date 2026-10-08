/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { SeamlessAuthClient } from '../client/createSeamlessAuthClient';
import type { LoginMethod } from '../client/createSeamlessAuthClient';
import { isValidEmail, isValidPhoneNumber } from './validation';

/**
 * Used only until the instance answers, and if it never does.
 *
 * Deliberately the narrowest useful set, and matching the auth server's own
 * defaults. Offering a method that turns out to be disabled sends a user down a
 * path that fails, which is worse than showing one option too few.
 */
export const FALLBACK_LOGIN_METHODS: LoginMethod[] = ['passkey', 'magic_link'];

/**
 * Which sign-in methods this instance has enabled, read from the auth server
 * rather than assumed.
 *
 * Resolves to null when the request fails or the answer is empty. A caller must
 * treat that as "unknown" and not as "none": the screens use it to decide what
 * is safe to offer, and guessing in either direction is worse than waiting.
 */
export async function loadLoginMethods(
  client: Pick<SeamlessAuthClient, 'getPublicSystemConfig'>
): Promise<LoginMethod[] | null> {
  try {
    const { data, error } = await client.getPublicSystemConfig();

    return !error && data?.loginMethods?.length ? data.loginMethods : null;
  } catch {
    // Backstop only. The client reports request failures through `error`, not
    // by throwing, and either way the methods stay unknown.
    return null;
  }
}

/**
 * Whether a user who declines a passkey would still have a way to sign in.
 *
 * Returns false while the methods are unknown, so a failed or in-flight request
 * never produces a skip control that could strand someone in an account they
 * cannot get back into.
 */
export const hasNonPasskeyLoginMethod = (loginMethods: LoginMethod[] | null) =>
  Boolean(loginMethods?.some(method => method !== 'passkey'));

/** Which fallback controls a sign-in screen should show. */
export interface FallbackSignInOptions {
  magicLink: boolean;
  emailOtp: boolean;
  phoneOtp: boolean;
  passkeyRetry: boolean;
}

/**
 * The fallback methods worth offering for an identifier.
 *
 * Null methods mean the caller has not resolved them yet. This is the last step
 * of a fallback flow, so it stays permissive and lets the handlers the screen
 * wired up decide, rather than hiding an option. `emailOtp` and `passkeyRetry`
 * say whether the screen has a handler for each.
 */
export function fallbackSignInOptions(
  identifier: string,
  loginMethods: LoginMethod[] | null | undefined,
  handlers: { emailOtp: boolean; passkeyRetry: boolean }
): FallbackSignInOptions {
  const allowed = new Set<LoginMethod>(
    loginMethods ?? ['passkey', 'magic_link', 'phone_otp']
  );

  return {
    magicLink: allowed.has('magic_link') && isValidEmail(identifier),
    emailOtp: allowed.has('email_otp') && handlers.emailOtp && isValidEmail(identifier),
    phoneOtp: allowed.has('phone_otp') && isValidPhoneNumber(identifier),
    passkeyRetry: allowed.has('passkey') && handlers.passkeyRetry,
  };
}

export const hasFallbackSignInOption = (options: FallbackSignInOptions) =>
  options.magicLink || options.emailOtp || options.phoneOtp || options.passkeyRetry;
