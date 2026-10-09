/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * The bundled screens, by key. Each is a named route (`seamless-auth-<key>`),
 * so the screens reach each other by name and work under any base path.
 *
 * Two paths are set by contracts outside this package: `verifyMagicLink` is the
 * URL the auth API builds when it emails a magic link, and `oauthCallback` is
 * registered with OAuth providers as an allowed redirect URI.
 */
export const authRoutePaths = {
  login: 'login',
  passkeyLogin: 'passkey-login',
  verifyPhoneOtp: 'verify-phone-otp',
  verifyEmailOtp: 'verify-email-otp',
  verifyMagicLink: 'verify-magiclink',
  oauthCallback: 'oauth/callback',
  registerPasskey: 'register-passkey',
  magicLinkSent: 'magic-link-sent',
} as const;

export type AuthScreen = keyof typeof authRoutePaths;

export const authRouteName = (screen: AuthScreen) => `seamless-auth-${screen}`;
