/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
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
 * - `recoveryCancel` is the link the auth API puts in every account recovery
 *   notice (`${FRONTEND_URL}/recovery/cancel#<token>`).
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
  recoveryCode: '/recovery-code',
  recoveryCodes: '/recovery-codes',
  accountRecovery: '/account-recovery',
  recoveryCancel: '/recovery/cancel',
} as const;
