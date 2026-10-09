/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

export { SaAuthLayout } from './components/AuthLayout';
export { SaFallbackOptions } from './components/FallbackOptions';
export { SaLogin } from './components/Login';
export { SaMagicLinkSent } from './components/MagicLinkSent';
export { SaOAuthCallback } from './components/OAuthCallback';
export { SaOAuthProviderButtons } from './components/OAuthProviderButtons';
export { SaOtpInput } from './components/OtpInput';
export { SaPasskeyLogin } from './components/PasskeyLogin';
export { SaRegisterPasskey } from './components/RegisterPasskey';
export { SaVerifyMagicLink } from './components/VerifyMagicLink';
export { SaVerifyOtp } from './components/VerifyOtp';
export { authGuard, guestGuard, requireAuth, requireGuest } from './guards';
export type { RequireAuthOptions, SeamlessAuthGuard } from './guards';
export { useAuthNavigation } from './navigation';
export { authRouteName, authRoutePaths } from './paths';
export type { AuthScreen } from './paths';
export { createSeamlessAuthRoutes } from './routes';
export type { SeamlessAuthRoutesOptions } from './routes';
