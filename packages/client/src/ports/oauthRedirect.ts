/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
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

/** Thrown by a redirect port asked to open anything but an http(s) URL. */
export class UnsafeAuthorizationUrlError extends Error {
  constructor(protocol: string | null) {
    super(
      protocol
        ? `Refused to open an OAuth authorization URL with the ${protocol} scheme. It must use https, or http on localhost.`
        : 'Refused to open an OAuth authorization URL that is not an absolute URL. It must use https, or http on localhost.'
    );
    this.name = 'UnsafeAuthorizationUrlError';
  }
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The scheme and host a browser would navigate to, following the WHATWG URL
 * parser for the cases that matter here: surrounding spaces and control
 * characters are trimmed, tabs and newlines anywhere are dropped, the scheme
 * is case-insensitive, and `\` separates like `/` in http(s). Done by hand
 * because React Native's built-in `URL` has not always implemented `protocol` or
 * `hostname`.
 */
function schemeAndHost(url: string): { scheme: string; host: string } | null {
  const cleaned = url
    // eslint-disable-next-line no-control-regex
    .replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '')
    .replace(/[\t\n\r]/g, '');
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):([\s\S]*)$/.exec(cleaned);
  if (!match) return null;

  const scheme = `${match[1].toLowerCase()}:`;
  if (scheme !== 'http:' && scheme !== 'https:') return { scheme, host: '' };

  const authority = match[2].replace(/^[/\\]+/, '').split(/[/\\?#]/)[0];
  const hostAndPort = authority.slice(authority.lastIndexOf('@') + 1);
  const host = hostAndPort.startsWith('[')
    ? hostAndPort.slice(0, hostAndPort.indexOf(']') + 1)
    : hostAndPort.split(':')[0];

  return { scheme, host: host.toLowerCase() };
}

/**
 * Throws `UnsafeAuthorizationUrlError` unless `url` is an absolute https URL,
 * or http on a loopback host. For a custom `OAuthRedirectPort`.
 */
export function assertNavigableAuthorizationUrl(url: string): void {
  const parsed = schemeAndHost(url);
  if (!parsed) {
    throw new UnsafeAuthorizationUrlError(null);
  }

  const allowed =
    (parsed.scheme === 'https:' && parsed.host !== '') ||
    (parsed.scheme === 'http:' && LOOPBACK.has(parsed.host));

  if (!allowed) {
    throw new UnsafeAuthorizationUrlError(parsed.scheme);
  }
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
      assertNavigableAuthorizationUrl(authorizationUrl);
      navigate(authorizationUrl);
      return { type: 'navigated' };
    },
  };
}
