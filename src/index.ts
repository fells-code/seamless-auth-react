/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { AuthContextType, AuthProvider, useAuth } from '@/AuthProvider';
import { AuthRoutes } from '@/AuthRoutes';
import {
  createSeamlessAuthClient,
  CurrentUserResult,
  LoginInput,
  PasskeyLoginResult,
  PasskeyMetadata,
  PasskeyRegistrationResult,
  RegisterInput,
  SeamlessAuthClient,
  SeamlessAuthClientOptions,
} from '@/client/createSeamlessAuthClient';
import { AuthMode } from '@/fetchWithAuth';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { Credential, User } from '@/types';

export {
  AuthProvider,
  AuthRoutes,
  createSeamlessAuthClient,
  useAuth,
  useAuthClient,
  usePasskeySupport,
};
export type {
  AuthContextType,
  AuthMode,
  Credential,
  CurrentUserResult,
  LoginInput,
  PasskeyLoginResult,
  PasskeyMetadata,
  PasskeyRegistrationResult,
  RegisterInput,
  SeamlessAuthClient,
  SeamlessAuthClientOptions,
  User,
};
