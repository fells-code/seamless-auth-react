/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

export { SEAMLESS_AUTH_CONFIG } from './config';
export type { SeamlessAuthConfig, SeamlessAuthPorts } from './config';
export { authGuard, guestGuard, requireAuth, requireGuest } from './guards';
export type { RequireAuthOptions, SeamlessAuthGuard } from './guards';
export { seamlessAuthInterceptor } from './interceptor';
export { provideSeamlessAuth } from './provide';
export { SeamlessAuth } from './seamless-auth.service';

// The client core, re-exported so an application imports from one package.
export {
  getOAuthErrorCode,
  getPasskeyPolicyErrorCode,
  getWebAuthnErrorDetail,
  hasScopedRole,
  isUnauthenticated,
  roleGrantsAccess,
  SeamlessAuthError,
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
