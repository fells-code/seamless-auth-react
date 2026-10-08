/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type {
  PasskeyAttachment,
  SeamlessAuthClient,
} from '../client/createSeamlessAuthClient';
import type { AuthSessionActions } from '../session/createAuthSession';
import type { LoginMethod } from '../client/createSeamlessAuthClient';
import { passkeyMetadataForThisDevice } from './device';
import { FALLBACK_LOGIN_METHODS } from './loginMethods';
import { passkeyRegistrationErrorMessage } from './messages';

export type SignInStep =
  | { kind: 'signed_in' }
  /**
   * The user picks how to continue. `passkeyFailed` is true when a passkey
   * ceremony was tried and did not complete.
   */
  | { kind: 'choose_method'; loginMethods: LoginMethod[]; passkeyFailed: boolean }
  | { kind: 'error'; message: string };

export const PASSKEY_SIGN_IN_FAILED =
  'Passkey sign-in could not be completed. Choose another sign-in method.';

/**
 * The first step of signing in with an identifier: start the login, then run
 * the passkey ceremony straight away when this device and this user can.
 *
 * The login response is per-user and authoritative when present. The instance
 * configuration is the better fallback than a hardcoded list, because it at
 * least reflects this deployment.
 */
export async function beginSignIn(
  actions: Pick<AuthSessionActions, 'login' | 'handlePasskeyLogin'>,
  input: {
    identifier: string;
    passkeySupported: boolean;
    configuredMethods: LoginMethod[] | null;
  }
): Promise<SignInStep> {
  const { data, error } = await actions.login(input.identifier, input.passkeySupported);

  if (error) {
    return { kind: 'error', message: 'Failed to start sign-in. Please try again.' };
  }

  const loginMethods = data?.loginMethods?.length
    ? data.loginMethods
    : (input.configuredMethods ?? FALLBACK_LOGIN_METHODS);

  if (input.passkeySupported && loginMethods.includes('passkey')) {
    const { error: passkeyError } = await actions.handlePasskeyLogin();

    if (!passkeyError) {
      return { kind: 'signed_in' };
    }

    return { kind: 'choose_method', loginMethods, passkeyFailed: true };
  }

  return { kind: 'choose_method', loginMethods, passkeyFailed: false };
}

/** Starts registration for an email. The next step is the email code. */
export async function registerWithEmail(
  client: Pick<SeamlessAuthClient, 'register'>,
  email: string
): Promise<{ error: string | null }> {
  const { data, error } = await client.register({ email });

  if (error) {
    return { error: 'Failed to register. Please try again.' };
  }

  if (data.message !== 'Success') {
    return {
      error:
        'An unexpected error occurred. Try again. If the problem persists, contact support.',
    };
  }

  return { error: null };
}

/**
 * Enrols a passkey on this device for the signed-in user, then refreshes the
 * session so the new credential appears in `credentials`.
 */
export async function enrollPasskey(
  deps: {
    client: Pick<SeamlessAuthClient, 'registerPasskey'>;
    refreshSession: AuthSessionActions['refreshSession'];
  },
  attachment?: PasskeyAttachment
): Promise<{ error: string | null }> {
  try {
    const { error } = await deps.client.registerPasskey({
      metadata: passkeyMetadataForThisDevice(),
      attachment,
    });

    if (error) {
      throw error;
    }

    await deps.refreshSession();

    return { error: null };
  } catch (error) {
    console.error('Passkey registration failed.');

    return { error: passkeyRegistrationErrorMessage(error) };
  }
}
