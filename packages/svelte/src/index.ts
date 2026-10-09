/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

export { createSeamlessAuth, SeamlessAuth } from './auth.svelte.js';
export type { SeamlessAuthConfig, SeamlessAuthPorts } from './config.js';
export {
  getAuthNavigator,
  getSeamlessAuth,
  setAuthNavigator,
  setSeamlessAuth,
} from './context.js';
export { authRoutePaths } from './navigation.js';
export type { AuthNavigator, AuthScreen } from './navigation.js';

export { default as SaAuthLayout } from './screens/AuthLayout.svelte';
export { default as SaFallbackOptions } from './screens/FallbackOptions.svelte';
export { default as SaLogin } from './screens/Login.svelte';
export { default as SaMagicLinkSent } from './screens/MagicLinkSent.svelte';
export { default as SaOAuthCallback } from './screens/OAuthCallback.svelte';
export { default as SaOAuthProviderButtons } from './screens/OAuthProviderButtons.svelte';
export { default as SaOtpInput } from './screens/OtpInput.svelte';
export { default as SaPasskeyLogin } from './screens/PasskeyLogin.svelte';
export { default as SaRegisterPasskey } from './screens/RegisterPasskey.svelte';
export { default as SaVerifyMagicLink } from './screens/VerifyMagicLink.svelte';
export { default as SaVerifyOtp } from './screens/VerifyOtp.svelte';

// The client core, re-exported so an application imports from one package.
export {
  getOAuthErrorCode,
  getPasskeyPolicyErrorCode,
  getWebAuthnErrorDetail,
  hasScopedRole,
  isUnauthenticated,
  roleGrantsAccess,
  SeamlessAuthError,
  UntrustedOriginError,
} from '@seamless-auth/client';
export type {
  AuthSessionState,
  Credential,
  CurrentUserResult,
  InitialSession,
  LoginMethod,
  OAuthProvider,
  OAuthRedirectPort,
  Organization,
  PasskeyPort,
  RefreshSessionOptions,
  SeamlessAuthClient,
  SeamlessAuthResult,
  StepUpStatus,
  User,
} from '@seamless-auth/client';
