/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * Canonical paths for the bundled auth screens. Kebab-case throughout so the
 * built-in route surface is predictable to type, document, and link to.
 */
export const authRoutePaths = {
  login: '/login',
  passkeyLogin: '/passkey-login',
  verifyPhoneOtp: '/verify-phone-otp',
  verifyEmailOtp: '/verify-email-otp',
  verifyMagicLink: '/verify-magic-link',
  oauthCallback: '/oauth/callback',
  registerPasskey: '/register-passkey',
  magicLinkSent: '/magic-link-sent',
} as const;

/**
 * Superseded paths, kept working so existing bookmarks and in-flight links do
 * not break.
 *
 * `/verify-magiclink` is a standing contract rather than a migration aid: the
 * auth API builds that URL when it sends a magic-link email, so it has to keep
 * resolving even after adopters move to the canonical paths.
 */
export const legacyAuthRouteAliases: ReadonlyArray<{ from: string; to: string }> = [
  { from: '/passKeyLogin', to: authRoutePaths.passkeyLogin },
  { from: '/verifyPhoneOTP', to: authRoutePaths.verifyPhoneOtp },
  { from: '/verifyEmailOTP', to: authRoutePaths.verifyEmailOtp },
  { from: '/verify-magiclink', to: authRoutePaths.verifyMagicLink },
  { from: '/registerPasskey', to: authRoutePaths.registerPasskey },
  { from: '/magiclinks-sent', to: authRoutePaths.magicLinkSent },
];
