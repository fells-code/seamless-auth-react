/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export { AuthProvider, useAuth } from '@/AuthProvider';
export type { AuthContextType, AuthProviderProps, NativeAuthPorts } from '@/AuthProvider';
export { describeDevice } from '@/deviceInfo';
export type { PlatformLike } from '@/deviceInfo';
export { useAuthClient } from '@/hooks/useAuthClient';
export { useAuthorizedFetch } from '@/hooks/useAuthorizedFetch';
export {
  FALLBACK_LOGIN_METHODS,
  hasNonPasskeyLoginMethod,
  useLoginMethods,
} from '@/hooks/useLoginMethods';
export { usePasskeySupport } from '@/hooks/usePasskeySupport';
export { createNativePasskeyPort } from '@/ports/nativePasskeys';
export type { NativePasskeysLike } from '@/ports/nativePasskeys';
export { createSecureStoreTokenStorage } from '@/ports/secureStoreTokenStorage';
export type {
  SecureStoreLike,
  SecureStoreTokenStorageOptions,
} from '@/ports/secureStoreTokenStorage';
export {
  createWebBrowserOAuthRedirect,
  parseOAuthCallbackUrl,
} from '@/ports/webBrowserOAuthRedirect';
export type { WebBrowserLike } from '@/ports/webBrowserOAuthRedirect';

// The client surface an application reaches for, re-exported so a native app
// installs one package.
export {
  createSeamlessAuthClient,
  encodePrfSalt,
  extractPasskeyPrfResult,
  getOAuthErrorCode,
  getPasskeyPolicyErrorCode,
  getWebAuthnErrorDetail,
  hasScopedRole,
  isUnauthenticated,
  PasskeyCeremonyError,
  roleGrantsAccess,
  SeamlessAuthError,
} from '@seamless-auth/client';
export type {
  Credential,
  CredentialUpdateResult,
  CurrentUserResult,
  FinishOAuthLoginInput,
  FinishOAuthLoginResult,
  LoginInput,
  LoginMethod,
  LoginStartResult,
  MessageResult,
  OAuthErrorCode,
  OAuthProvider,
  OAuthProvidersResult,
  OAuthRedirectOutcome,
  OAuthRedirectPort,
  Organization,
  OrganizationMembership,
  OrganizationSwitchResult,
  PasskeyAttachment,
  PasskeyLoginData,
  PasskeyMetadata,
  PasskeyPolicyErrorCode,
  PasskeyPort,
  PasskeyPrfInput,
  PasskeyPrfResult,
  PasskeyRegistrationData,
  PublicSystemConfigResult,
  RegisterInput,
  RegisterPasskeyOptions,
  SeamlessAuthClient,
  SeamlessAuthClientOptions,
  SeamlessAuthResult,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpMethod,
  StepUpPrfData,
  StepUpStatus,
  StoredTokens,
  TokenStoragePort,
  TotpEnrollmentStartResult,
  TotpStatus,
  User,
  WebAuthnErrorDetail,
} from '@seamless-auth/client';
