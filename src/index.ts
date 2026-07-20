/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { AuthContextType, AuthProvider, useAuth } from '@/AuthProvider';
import { AuthRoutes } from '@/AuthRoutes';
import {
  createSeamlessAuthClient,
  CredentialUpdateResult,
  CreateOrganizationInput,
  CurrentUserResult,
  FinishOAuthLoginInput,
  LoginInput,
  LoginMethod,
  LoginStartResult,
  MessageResult,
  OAuthProvider,
  OAuthProvidersResult,
  OrganizationMemberInput,
  OrganizationMemberUpdateInput,
  OrganizationMembersResult,
  OrganizationMembershipResult,
  OrganizationResult,
  OrganizationSwitchResult,
  OrganizationsResult,
  PasskeyLoginData,
  PasskeyMetadata,
  PasskeyRegistrationData,
  RegisterInput,
  RegisterPasskeyOptions,
  SeamlessAuthClient,
  SeamlessAuthClientOptions,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpMethod,
  StepUpStatus,
  StepUpPrfData,
  TotpEnrollmentStartResult,
  TotpStatus,
  UpdateOrganizationInput,
} from '@/client/createSeamlessAuthClient';
import { SeamlessAuthError } from '@/client/errors';
import type { SeamlessAuthResult } from '@/client/result';
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
  SeamlessAuthError,
  useAuth,
  useAuthClient,
  usePasskeySupport,
};
export type {
  CredentialUpdateResult,
  AuthContextType,
  Credential,
  CreateOrganizationInput,
  CurrentUserResult,
  FinishOAuthLoginInput,
  LoginInput,
  LoginMethod,
  LoginStartResult,
  MessageResult,
  OAuthProvider,
  OAuthProvidersResult,
  Organization,
  OrganizationMemberInput,
  OrganizationMembership,
  OrganizationMemberUpdateInput,
  OrganizationMembersResult,
  OrganizationMembershipResult,
  OrganizationResult,
  OrganizationSwitchResult,
  OrganizationsResult,
  PasskeyLoginData,
  PasskeyMetadata,
  PasskeyPrfInput,
  PasskeyPrfResult,
  PasskeyRegistrationData,
  RegisterInput,
  RegisterPasskeyOptions,
  SeamlessAuthClient,
  SeamlessAuthClientOptions,
  SeamlessAuthResult,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpMethod,
  StepUpStatus,
  StepUpPrfData,
  TotpEnrollmentStartResult,
  TotpStatus,
  UpdateOrganizationInput,
  User,
};
