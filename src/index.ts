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
  LoginInput,
  LoginMethod,
  LoginStartResult,
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
  StepUpMethod,
  StepUpStatus,
  StepUpWithPasskeyPrfResult,
  StepUpVerificationResult,
  UpdateOrganizationInput,
} from '@/client/createSeamlessAuthClient';
import {
  encodePrfSalt,
  extractPasskeyPrfResult,
  isPasskeyPrfSupported,
  PasskeyPrfInput,
  PasskeyPrfResult,
} from '@/client/webauthnPrf';
import { AuthMode } from '@/fetchWithAuth';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { Credential, Organization, OrganizationMembership, User } from '@/types';

export {
  AuthProvider,
  AuthRoutes,
  createSeamlessAuthClient,
  encodePrfSalt,
  extractPasskeyPrfResult,
  isPasskeyPrfSupported,
  useAuth,
  useAuthClient,
  usePasskeySupport,
};
export type {
  AuthContextType,
  AuthMode,
  Credential,
  CreateOrganizationInput,
  CurrentUserResult,
  LoginInput,
  LoginMethod,
  LoginStartResult,
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
  StepUpMethod,
  StepUpStatus,
  StepUpWithPasskeyPrfResult,
  StepUpVerificationResult,
  UpdateOrganizationInput,
  User,
};
