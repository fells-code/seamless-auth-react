/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import type { OAuthRedirectPort } from '@seamless-auth/client';

/**
 * The part of `expo-web-browser` this port uses. Passed in rather than
 * imported, like the other native modules.
 */
export interface WebBrowserLike {
  openAuthSessionAsync(
    url: string,
    redirectUrl?: string,
    options?: unknown
  ): Promise<{ type: string; url?: string }>;
}

/**
 * Reads `code` and `state` off the URL the provider sent the user back to.
 * Exported for the screens that handle a deep link themselves.
 */
export function parseOAuthCallbackUrl(
  url: string
): { code: string; state: string } | null {
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    // A custom scheme such as `myapp://oauth/callback?code=...` does not
    // always parse as a URL on every runtime; fall back to the query string.
    const query = url.split('?')[1];
    if (!query) return null;
    params = new URLSearchParams(query.split('#')[0]);
  }

  const code = params.get('code');
  const state = params.get('state');
  return code && state ? { code, state } : null;
}

/**
 * Opens the provider in an in-app browser session (`ASWebAuthenticationSession`
 * on iOS, a Custom Tab on Android) and hands the callback straight back, so
 * the sign-in finishes without the app being reopened through a deep link.
 *
 * `redirectUri` must be the one the provider returns to, registered with the
 * provider and allowed by the auth API: a universal link or the app's scheme.
 *
 * ```ts
 * import * as WebBrowser from 'expo-web-browser';
 * const oauthRedirect = createWebBrowserOAuthRedirect(WebBrowser);
 * ```
 */
export function createWebBrowserOAuthRedirect(
  browser: WebBrowserLike,
  options?: unknown
): OAuthRedirectPort {
  return {
    async open(authorizationUrl, redirectUri) {
      const result = await browser.openAuthSessionAsync(
        authorizationUrl,
        redirectUri,
        options
      );

      if (result.type !== 'success' || !result.url) {
        return { type: 'cancelled' };
      }

      const callback = parseOAuthCallbackUrl(result.url);
      return callback ? { type: 'callback', ...callback } : { type: 'cancelled' };
    },
  };
}
