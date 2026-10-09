/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * The bundled screens, by key, and their default paths.
 *
 * Two paths are set by contracts outside this package: `verifyMagicLink` is the
 * URL the auth API builds when it emails a magic link, and `oauthCallback` is
 * registered with OAuth providers as an allowed redirect URI.
 */
export const authRoutePaths = {
  login: '/login',
  passkeyLogin: '/passkey-login',
  verifyPhoneOtp: '/verify-phone-otp',
  verifyEmailOtp: '/verify-email-otp',
  verifyMagicLink: '/verify-magiclink',
  oauthCallback: '/oauth/callback',
  registerPasskey: '/register-passkey',
  magicLinkSent: '/magic-link-sent',
} as const;

export type AuthScreen = keyof typeof authRoutePaths;

/**
 * How the bundled screens move, supplied by the application's router. The
 * screens never import a router themselves, so they work in SvelteKit (see
 * `createKitNavigator` in `@seamless-auth/svelte/kit`) or with any other router
 * that can implement this.
 */
export interface AuthNavigator {
  /** Go to another bundled screen, handing it some navigation state. */
  toScreen(screen: AuthScreen, state?: Record<string, string>): Promise<void>;
  /** Go to an in-app path, or to the configured `signedInPath`. */
  toApp(path?: string): Promise<void>;
  /** Go to a path as the browser sees it, base path included. */
  toLocation(browserPath: string): Promise<void>;
  /** The navigation state the previous screen handed over. */
  state(): Record<string, unknown>;
  /** A query parameter of the current URL. */
  query(name: string): string | null;
  /** Drop the query from the current URL in place, without leaving the screen. */
  dropQuery(): Promise<void>;
  /** A screen's absolute URL, for a redirect URI. */
  absoluteUrl(screen: AuthScreen): string;
}
