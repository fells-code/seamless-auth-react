/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * What happened after the provider was opened.
 *
 * On the web the page navigates away, so nothing comes back through this port:
 * the provider returns the user to the callback route, which finishes the
 * login. A native binding opens an in-app browser session and receives the
 * callback URL directly, so it resolves with the `code` and `state` to finish
 * the login with, or `cancelled` when the user dismissed it.
 */
export type OAuthRedirectOutcome =
  | { type: 'navigated' }
  | { type: 'callback'; code: string; state: string }
  | { type: 'cancelled' };

export interface OAuthRedirectPort {
  open(authorizationUrl: string, redirectUri: string): Promise<OAuthRedirectOutcome>;
}

/**
 * The browser's redirect: a full navigation to the provider. The default port
 * for web applications. `navigate` exists for tests, since jsdom's
 * `window.location` cannot be stubbed.
 */
export function createBrowserOAuthRedirect(
  navigate: (url: string) => void = url => window.location.assign(url)
): OAuthRedirectPort {
  return {
    async open(authorizationUrl) {
      navigate(authorizationUrl);
      return { type: 'navigated' };
    },
  };
}
