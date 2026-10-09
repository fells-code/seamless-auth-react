/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type {
  InitialSession,
  OAuthRedirectPort,
  PasskeyPort,
} from '@seamless-auth/client';

/**
 * What a browser application configures. There is no transport mode: a Vue
 * application runs in the browser, where the server adapter holds the tokens
 * and the browser holds only its HttpOnly cookies.
 */
export interface SeamlessAuthConfig {
  /** Origin of the server adapter, for example `https://app.example.com`. */
  apiHost: string;
  /** Where the adapter is mounted on `apiHost`. Defaults to `/auth`. */
  basePath?: string;
  /** Where a magic link sent by the bundled screens should land. */
  magicLinkRedirectUri?: string;
  /**
   * Whether `hasSignedInBefore` reports a previous sign-in from this browser,
   * which the bundled login screen uses to open on Sign In rather than Create
   * Account. Defaults to true.
   */
  autoDetectPreviousSignIn?: boolean;
  /**
   * The session a server already resolved for this request, or `null` when it
   * found none. The first render is then settled rather than loading, and the
   * session revalidates in the background once the app runs in the browser.
   */
  initialSession?: InitialSession | null;
  /** Platform ports. Each one left out falls back to the browser's. */
  ports?: Partial<SeamlessAuthPorts>;
  /** A fetch to send auth requests with. Defaults to the global one. */
  fetch?: typeof fetch;
  /**
   * Origins besides `apiHost` that `authorizedFetch` may send the session
   * cookies to. Every other origin is refused.
   */
  trustedOrigins?: string[];
  /** Where the bundled screens go once someone is signed in. Defaults to `/`. */
  signedInPath?: string;
  /** Where `requireAuth` sends someone who is signed out. Defaults to `/login`. */
  loginPath?: string;
}

export interface SeamlessAuthPorts {
  passkeys: PasskeyPort;
  oauthRedirect: OAuthRedirectPort;
}
