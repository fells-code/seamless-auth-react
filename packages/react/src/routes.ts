/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

/**
 * Paths for the bundled auth screens.
 *
 * Kebab-case throughout, except for two paths that are dictated by contracts
 * outside this package rather than by the naming convention:
 *
 * - `verifyMagicLink` is the URL the auth API builds when it emails a magic
 *   link, so it has to match that value exactly.
 * - `oauthCallback` is registered with OAuth providers as an allowed redirect
 *   URI, so renaming it would break configured integrations.
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
