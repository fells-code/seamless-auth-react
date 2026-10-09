/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

export type { SeamlessAuthConfig, SeamlessAuthPorts } from './config';
export { createSeamlessAuth, SEAMLESS_AUTH_KEY, useSeamlessAuth } from './plugin';
export type { SeamlessAuth } from './plugin';

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
