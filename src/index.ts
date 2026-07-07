/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { AuthContextType, AuthProvider, useAuth } from '@/AuthProvider';
import { AuthRoutes } from '@/AuthRoutes';
import {
  createSeamlessAuthClient,
  CreateOrganizationInput,
  CurrentUserResult,
  FinishOAuthLoginInput,
  LoginInput,
  LoginMethod,
  LoginStartResult,
  OAuthProvider,
  OAuthProvidersResult,
  OrganizationMemberInput,
  OrganizationMemberUpdateInput,
  OrganizationMembersResult,
  OrganizationResult,
  OrganizationsResult,
  PasskeyLoginResult,
  PasskeyLoginWithPrfResult,
  PasskeyMetadata,
  PasskeyRegistrationResult,
  RegisterInput,
  RegisterPasskeyOptions,
  SeamlessAuthClient,
  SeamlessAuthClientOptions,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpMethod,
  StepUpStatus,
  StepUpWithPasskeyPrfResult,
  StepUpVerificationResult,
  TotpEnrollmentStartResult,
  TotpStatus,
  UpdateOrganizationInput,
} from '@/client/createSeamlessAuthClient';
import {
  encodePrfSalt,
  extractPasskeyPrfResult,
  isPasskeyPrfSupported,
  PasskeyPrfInput,
  PasskeyPrfResult,
} from '@/client/webauthnPrf';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { hasScopedRole, roleGrantsAccess } from '@/scopedRoles';
import { Credential, Organization, OrganizationMembership, User } from '@/types';

export {
  AuthProvider,
  AuthRoutes,
  createSeamlessAuthClient,
  encodePrfSalt,
  extractPasskeyPrfResult,
  hasScopedRole,
  isPasskeyPrfSupported,
  roleGrantsAccess,
  useAuth,
  useAuthClient,
  usePasskeySupport,
};
export type {
  AuthContextType,
  Credential,
  CreateOrganizationInput,
  CurrentUserResult,
  FinishOAuthLoginInput,
  LoginInput,
  LoginMethod,
  LoginStartResult,
  OAuthProvider,
  OAuthProvidersResult,
  Organization,
  OrganizationMemberInput,
  OrganizationMembership,
  OrganizationMemberUpdateInput,
  OrganizationMembersResult,
  OrganizationResult,
  OrganizationsResult,
  PasskeyLoginWithPrfResult,
  PasskeyLoginResult,
  PasskeyMetadata,
  PasskeyPrfInput,
  PasskeyPrfResult,
  PasskeyRegistrationResult,
  RegisterInput,
  RegisterPasskeyOptions,
  SeamlessAuthClient,
  SeamlessAuthClientOptions,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpMethod,
  StepUpStatus,
  StepUpWithPasskeyPrfResult,
  StepUpVerificationResult,
  TotpEnrollmentStartResult,
  TotpStatus,
  UpdateOrganizationInput,
  User,
};
