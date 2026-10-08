/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { OAuthRedirectPort } from '../ports/oauthRedirect';
import type { AuthSessionActions } from '../session/createAuthSession';
import { oauthErrorMessage } from './messages';
import { inAppPath } from './redirects';

/**
 * Where the provider being signed in with is kept across the redirect. Only the
 * provider id is stored: never a code, state, or token.
 */
export const OAUTH_PROVIDER_STORAGE_KEY = 'seamless:oauth:provider';

/** The path the bundled screens register with providers as the redirect URI. */
export const OAUTH_CALLBACK_PATH = '/oauth/callback';

function pendingProviderStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function readPendingOAuthProvider(): string | null {
  try {
    return pendingProviderStore()?.getItem(OAUTH_PROVIDER_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writePendingOAuthProvider(providerId: string | null) {
  try {
    const store = pendingProviderStore();

    if (providerId === null) store?.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
    else store?.setItem(OAUTH_PROVIDER_STORAGE_KEY, providerId);
  } catch {
    // Storage can be unavailable, for example in private mode.
  }
}

/**
 * Starts signing in with a provider. In a browser the port navigates away and
 * the callback screen finishes the login. A port that hands the callback
 * straight back (an in-app browser session) finishes it here instead.
 */
export async function startOAuthSignIn(
  deps: {
    actions: Pick<AuthSessionActions, 'startOAuthLogin' | 'finishOAuthLogin'>;
    oauthRedirect: OAuthRedirectPort;
  },
  input: { providerId: string; redirectUri: string }
): Promise<{ error: string | null }> {
  const { providerId, redirectUri } = input;

  writePendingOAuthProvider(providerId);

  const { data, error } = await deps.actions.startOAuthLogin({ providerId, redirectUri });

  if (error) {
    return { error: 'Could not start sign-in with this provider.' };
  }

  const outcome = await deps.oauthRedirect.open(data.authorizationUrl, redirectUri);

  if (outcome.type === 'callback') {
    const finished = await deps.actions.finishOAuthLogin({
      providerId,
      code: outcome.code,
      state: outcome.state,
    });

    if (finished.error) {
      return { error: 'Could not finish sign-in with this provider.' };
    }
  }

  return { error: null };
}

export type OAuthCallbackOutcome =
  | { kind: 'error'; message: string }
  /** The API wants a passkey enrolled first. `returnTo` is where to go after. */
  | { kind: 'enroll_passkey'; returnTo: string }
  | { kind: 'done'; destination: string };

/**
 * Finishes a provider sign-in on the redirect URI. `params` is the callback
 * URL's query, and `origin` the application's own origin, used to keep the
 * destination in-app.
 */
export async function completeOAuthCallback(
  actions: Pick<AuthSessionActions, 'finishOAuthLogin'>,
  params: { get(name: string): string | null },
  origin: string
): Promise<OAuthCallbackOutcome> {
  const code = params.get('code');
  const state = params.get('state');
  const providerId = readPendingOAuthProvider();

  if (!code || !state || !providerId) {
    return {
      kind: 'error',
      message: 'This sign-in link is missing required information.',
    };
  }

  const { data, error } = await actions.finishOAuthLogin({ providerId, code, state });

  if (error) {
    return { kind: 'error', message: oauthErrorMessage(error) };
  }

  writePendingOAuthProvider(null);
  const destination = inAppPath(data?.returnTo, origin) ?? '/';

  if (data?.nextStep === 'enroll_passkey') {
    return { kind: 'enroll_passkey', returnTo: destination };
  }

  return { kind: 'done', destination };
}
