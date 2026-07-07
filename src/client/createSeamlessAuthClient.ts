/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  WebAuthnError,
} from '@simplewebauthn/browser';

import { createFetchWithAuth } from '../fetchWithAuth';
import { Credential, Organization, OrganizationMembership, User } from '../types';
import {
  createPrfRequestBody,
  extractPasskeyPrfResult,
  getRegistrationPrfCapable,
  isPasskeyPrfSupported,
  PasskeyPrfInput,
  PasskeyPrfResult,
  preparePrfRequestOptions,
  stripPrfResultsFromAssertion,
} from './webauthnPrf';

export interface SeamlessAuthClientOptions {
  apiHost: string;
}

export interface LoginInput {
  identifier: string;
  passkeyAvailable: boolean;
}

export type LoginMethod = 'passkey' | 'magic_link' | 'email_otp' | 'phone_otp' | 'oauth';

export interface LoginStartResult {
  message?: string;
  identifierType?: 'email' | 'phone';
  loginMethods?: LoginMethod[];
}

export interface RegisterInput {
  email: string;
  phone: string;
  bootstrapToken?: string | null;
}

export interface PasskeyMetadata {
  friendlyName: string;
  platform: string;
  browser: string;
  deviceInfo: string;
}

export interface CurrentUserResult {
  user: User;
  credentials: Credential[];
  organizations?: Organization[];
  activeOrganization?: Organization | null;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  metadata?: Record<string, unknown> | null;
}

export interface OrganizationMemberInput {
  userId?: string;
  email?: string;
  roles?: string[];
  scopes?: string[];
}

export interface OrganizationMemberUpdateInput {
  roles?: string[];
  scopes?: string[];
}

export interface OrganizationsResult {
  organizations: Organization[];
  activeOrganizationId?: string | null;
}

export interface OrganizationResult {
  organization: Organization;
}

export interface OrganizationMembersResult {
  members: OrganizationMembership[];
  total: number;
}

export interface OAuthProvider {
  id: string;
  name: string;
  scopes: string[];
}

export interface OAuthProvidersResult {
  providers: OAuthProvider[];
}

export interface StartOAuthLoginInput {
  providerId: string;
  redirectUri?: string;
  returnTo?: string;
}

export interface StartOAuthLoginResult {
  provider: OAuthProvider;
  state: string;
  authorizationUrl: string;
}

export interface FinishOAuthLoginInput {
  providerId: string;
  code: string;
  state: string;
}

export interface PasskeyLoginResult {
  success: boolean;
  mfaRequired: boolean;
  message: string;
}

export interface PasskeyRegistrationResult {
  success: boolean;
  message: string;
  credentialId?: string;
  prfCapable?: boolean;
}

export interface RegisterPasskeyOptions {
  metadata: PasskeyMetadata;
  requestPrf?: boolean;
  requirePrf?: boolean;
}

export type StepUpMethod = 'webauthn' | 'totp';

export interface TotpStatus {
  enabled: boolean;
  verifiedAt: string | null;
  lastUsedAt: string | null;
}

export interface TotpEnrollmentStartResult {
  message: string;
  secret: string;
  otpauthUrl: string;
  issuer: string;
  accountName: string;
  algorithm: string;
  digits: number;
  period: number;
}

export interface StepUpStatus {
  fresh: boolean;
  method: StepUpMethod | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  maxAgeSeconds: number;
}

export interface StepUpVerificationResult extends StepUpStatus {
  success: boolean;
  message: string;
}

export interface PasskeyLoginOptions {
  prf?: PasskeyPrfInput;
}

export interface PasskeyLoginWithPrfResult extends PasskeyLoginResult {
  prf?: PasskeyPrfResult;
}

export interface StepUpWithPasskeyPrfResult extends StepUpVerificationResult {
  credentialId: string | null;
  prf: PasskeyPrfResult | null;
}

export type LogoutScope = 'current_session' | 'all_sessions';

export interface LogoutOptions {
  scope?: LogoutScope;
}

export interface SeamlessAuthClient {
  getCurrentUser: () => Promise<Response>;
  login: (input: LoginInput) => Promise<Response>;
  loginWithPasskey: (options?: PasskeyLoginOptions) => Promise<PasskeyLoginWithPrfResult>;
  logout: (options?: LogoutOptions) => Promise<Response>;
  logoutAllSessions: () => Promise<Response>;
  deleteUser: () => Promise<Response>;
  register: (input: RegisterInput) => Promise<Response>;
  requestPhoneOtp: () => Promise<Response>;
  verifyPhoneOtp: (verificationToken: string) => Promise<Response>;
  requestLoginPhoneOtp: () => Promise<Response>;
  verifyLoginPhoneOtp: (verificationToken: string) => Promise<Response>;
  requestEmailOtp: () => Promise<Response>;
  verifyEmailOtp: (verificationToken: string) => Promise<Response>;
  requestLoginEmailOtp: () => Promise<Response>;
  verifyLoginEmailOtp: (verificationToken: string) => Promise<Response>;
  requestMagicLink: () => Promise<Response>;
  checkMagicLink: () => Promise<Response>;
  verifyMagicLink: (token: string) => Promise<Response>;
  listOAuthProviders: () => Promise<OAuthProvidersResult>;
  startOAuthLogin: (input: StartOAuthLoginInput) => Promise<StartOAuthLoginResult>;
  finishOAuthLogin: (input: FinishOAuthLoginInput) => Promise<Response>;
  registerPasskey: (
    input: PasskeyMetadata | RegisterPasskeyOptions
  ) => Promise<PasskeyRegistrationResult>;
  isPasskeyPrfSupported: () => Promise<boolean>;
  getStepUpStatus: () => Promise<Response>;
  verifyStepUpWithPasskey: () => Promise<StepUpVerificationResult>;
  verifyStepUpWithPasskeyPrf: (
    input: PasskeyPrfInput
  ) => Promise<StepUpWithPasskeyPrfResult>;
  getTotpStatus: () => Promise<Response>;
  startTotpEnrollment: () => Promise<Response>;
  verifyTotpEnrollment: (code: string) => Promise<Response>;
  disableTotp: (code: string) => Promise<Response>;
  verifyStepUpWithTotp: (code: string) => Promise<StepUpVerificationResult>;
  updateCredential: (input: {
    id: string;
    friendlyName: string | null;
  }) => Promise<Response>;
  deleteCredential: (id: string) => Promise<Response>;
  listOrganizations: () => Promise<Response>;
  createOrganization: (input: CreateOrganizationInput) => Promise<Response>;
  getOrganization: (organizationId: string) => Promise<Response>;
  updateOrganization: (
    organizationId: string,
    input: UpdateOrganizationInput
  ) => Promise<Response>;
  switchOrganization: (organizationId: string) => Promise<Response>;
  listOrganizationMembers: (organizationId: string) => Promise<Response>;
  addOrganizationMember: (
    organizationId: string,
    input: OrganizationMemberInput
  ) => Promise<Response>;
  updateOrganizationMember: (
    organizationId: string,
    userId: string,
    input: OrganizationMemberUpdateInput
  ) => Promise<Response>;
  removeOrganizationMember: (organizationId: string, userId: string) => Promise<Response>;
}

const staleStepUpResult = (message: string): StepUpVerificationResult => ({
  success: false,
  fresh: false,
  method: null,
  verifiedAt: null,
  expiresAt: null,
  maxAgeSeconds: 0,
  message,
});

const staleStepUpPrfResult = (message: string): StepUpWithPasskeyPrfResult => ({
  ...staleStepUpResult(message),
  credentialId: null,
  prf: null,
});

function normalizeRegisterPasskeyInput(
  input: PasskeyMetadata | RegisterPasskeyOptions
): RegisterPasskeyOptions {
  if ('metadata' in input) {
    return input;
  }

  return { metadata: input };
}

function buildRegisterStartPath(input: RegisterPasskeyOptions) {
  const query = new URLSearchParams();

  if (input.requirePrf) {
    query.set('requirePrf', 'true');
  } else if (input.requestPrf) {
    query.set('requestPrf', 'true');
  }

  const queryString = query.toString();

  return `/webAuthn/register/start${queryString ? `?${queryString}` : ''}`;
}

function buildAssertionStartInit(input?: PasskeyPrfInput): RequestInit {
  if (!input) {
    return { method: 'POST' };
  }

  return {
    method: 'POST',
    body: JSON.stringify(createPrfRequestBody(input)),
  };
}

export const createSeamlessAuthClient = (
  opts: SeamlessAuthClientOptions
): SeamlessAuthClient => {
  const fetchWithAuth = createFetchWithAuth({
    authHost: opts.apiHost,
  });

  return {
    getCurrentUser: () =>
      fetchWithAuth(`users/me`, {
        method: 'GET',
      }),

    login: input =>
      fetchWithAuth(`/login`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    loginWithPasskey: async optionsInput => {
      const response = await fetchWithAuth(`/webAuthn/login/start`, {
        ...buildAssertionStartInit(optionsInput?.prf),
      });

      if (!response.ok) {
        return {
          success: false,
          mfaRequired: false,
          message: 'Failed to start passkey login.',
        };
      }

      try {
        const options = await response.json();
        const credential = (await startAuthentication({
          optionsJSON: preparePrfRequestOptions(options),
        })) as AuthenticationResponseJSON;
        const prf = extractPasskeyPrfResult(credential);
        const assertionResponse = stripPrfResultsFromAssertion(credential);

        const verificationResponse = await fetchWithAuth(`/webAuthn/login/finish`, {
          method: 'POST',
          body: JSON.stringify({ assertionResponse }),
        });

        if (!verificationResponse.ok) {
          return {
            success: false,
            mfaRequired: false,
            message: 'Failed to verify passkey.',
          };
        }

        const verificationResult = await verificationResponse.json();

        if (verificationResult.message === 'Success') {
          return {
            success: !verificationResult.mfaLogin,
            mfaRequired: Boolean(verificationResult.mfaLogin),
            message: verificationResult.mfaLogin
              ? 'Passkey login requires MFA.'
              : 'Passkey login succeeded.',
            ...(prf ? { prf } : {}),
          };
        }

        return {
          success: false,
          mfaRequired: false,
          message: verificationResult.message ?? 'Passkey login failed.',
        };
      } catch {
        console.error('Passkey login error.');
        return {
          success: false,
          mfaRequired: false,
          message: 'Passkey login failed.',
        };
      }
    },

    logout: (options = {}) =>
      fetchWithAuth(options.scope === 'all_sessions' ? `/logout/all` : `/logout`, {
        method: 'DELETE',
      }),

    logoutAllSessions: () =>
      fetchWithAuth(`/logout/all`, {
        method: 'DELETE',
      }),

    deleteUser: () =>
      fetchWithAuth(`/users/delete`, {
        method: 'DELETE',
      }),

    register: input =>
      fetchWithAuth(`/registration/register`, {
        method: 'POST',
        body: JSON.stringify({
          email: input.email,
          phone: input.phone,
          ...(input.bootstrapToken ? { bootstrapToken: input.bootstrapToken } : {}),
        }),
      }),

    requestPhoneOtp: () =>
      fetchWithAuth(`/otp/generate-phone-otp`, {
        method: 'GET',
      }),

    verifyPhoneOtp: verificationToken =>
      fetchWithAuth(`/otp/verify-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationToken,
        }),
        credentials: 'include',
      }),

    requestLoginPhoneOtp: () =>
      fetchWithAuth(`/otp/generate-login-phone-otp`, {
        method: 'GET',
      }),

    verifyLoginPhoneOtp: verificationToken =>
      fetchWithAuth(`/otp/verify-login-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationToken,
        }),
        credentials: 'include',
      }),

    requestEmailOtp: () =>
      fetchWithAuth(`/otp/generate-email-otp`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),

    verifyEmailOtp: verificationToken =>
      fetchWithAuth(`/otp/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken,
        }),
        credentials: 'include',
      }),

    requestLoginEmailOtp: () =>
      fetchWithAuth(`/otp/generate-login-email-otp`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),

    verifyLoginEmailOtp: verificationToken =>
      fetchWithAuth(`/otp/verify-login-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken,
        }),
        credentials: 'include',
      }),

    requestMagicLink: () =>
      fetchWithAuth(`/magic-link`, {
        method: 'GET',
      }),

    checkMagicLink: () =>
      fetchWithAuth(`/magic-link/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }),

    verifyMagicLink: token =>
      fetchWithAuth(`/magic-link/verify/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }),

    listOAuthProviders: async () => {
      const response = await fetchWithAuth(`/oauth/providers`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to list OAuth providers.');
      }

      return response.json();
    },

    startOAuthLogin: async input => {
      const response = await fetchWithAuth(
        `/oauth/${encodeURIComponent(input.providerId)}/start`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...(input.redirectUri ? { redirectUri: input.redirectUri } : {}),
            ...(input.returnTo ? { returnTo: input.returnTo } : {}),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start OAuth login.');
      }

      return response.json();
    },

    finishOAuthLogin: input =>
      fetchWithAuth(`/oauth/${encodeURIComponent(input.providerId)}/callback`, {
        method: 'POST',
        body: JSON.stringify({
          code: input.code,
          state: input.state,
        }),
      }),

    registerPasskey: async input => {
      const registerInput = normalizeRegisterPasskeyInput(input);
      const challengeRes = await fetchWithAuth(buildRegisterStartPath(registerInput), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!challengeRes.ok) {
        return {
          success: false,
          message: 'Failed to fetch passkey registration challenge.',
        };
      }

      const options = await challengeRes.json();

      let attestationResponse: RegistrationResponseJSON;

      try {
        attestationResponse = await startRegistration({ optionsJSON: options });
      } catch (error) {
        if (error instanceof WebAuthnError) {
          return {
            success: false,
            message: error.name,
          };
        }

        console.error('Passkey registration error.');
        return {
          success: false,
          message: 'Passkey registration failed.',
        };
      }

      const verificationResp = await fetchWithAuth(`/webAuthn/register/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attestationResponse,
          metadata: {
            ...registerInput.metadata,
            prfCapable: getRegistrationPrfCapable(attestationResponse),
          },
        }),
        credentials: 'include',
      });

      if (!verificationResp.ok) {
        return {
          success: false,
          message: 'Verification failed.',
        };
      }

      return {
        success: true,
        message: 'Passkey registered successfully.',
        credentialId: attestationResponse.id,
        prfCapable: getRegistrationPrfCapable(attestationResponse),
      };
    },

    isPasskeyPrfSupported,

    getStepUpStatus: () =>
      fetchWithAuth(`/step-up/status`, {
        method: 'GET',
      }),

    verifyStepUpWithPasskey: async () => {
      const response = await fetchWithAuth(`/step-up/webauthn/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        return staleStepUpResult('Failed to start step-up authentication.');
      }

      try {
        const options = await response.json();
        const credential = (await startAuthentication({
          optionsJSON: preparePrfRequestOptions(options),
        })) as AuthenticationResponseJSON;
        const assertionResponse = stripPrfResultsFromAssertion(credential);

        const verificationResponse = await fetchWithAuth(`/step-up/webauthn/finish`, {
          method: 'POST',
          body: JSON.stringify({ assertionResponse }),
        });

        if (!verificationResponse.ok) {
          return staleStepUpResult('Failed to verify step-up authentication.');
        }

        const verificationResult = await verificationResponse.json();
        const method =
          verificationResult.method === 'webauthn' ? verificationResult.method : null;
        const success =
          verificationResult.message === 'Success' &&
          verificationResult.fresh === true &&
          method === 'webauthn';

        return {
          success,
          fresh: Boolean(verificationResult.fresh),
          method,
          verifiedAt: verificationResult.verifiedAt ?? null,
          expiresAt: verificationResult.expiresAt ?? null,
          maxAgeSeconds: verificationResult.maxAgeSeconds ?? 0,
          message: success
            ? 'Step-up authentication succeeded.'
            : (verificationResult.message ?? 'Step-up authentication failed.'),
        };
      } catch {
        console.error('Step-up authentication error.');
        return staleStepUpResult('Step-up authentication failed.');
      }
    },

    verifyStepUpWithPasskeyPrf: async input => {
      const response = await fetchWithAuth(`/step-up/webauthn/start`, {
        ...buildAssertionStartInit(input),
      });

      if (!response.ok) {
        return staleStepUpPrfResult('Failed to start step-up authentication.');
      }

      try {
        const options = await response.json();
        const credential = (await startAuthentication({
          optionsJSON: preparePrfRequestOptions(options),
        })) as AuthenticationResponseJSON;
        const prf = extractPasskeyPrfResult(credential);
        const assertionResponse = stripPrfResultsFromAssertion(credential);

        if (!prf) {
          return staleStepUpPrfResult('Passkey did not return PRF output.');
        }

        const verificationResponse = await fetchWithAuth(`/step-up/webauthn/finish`, {
          method: 'POST',
          body: JSON.stringify({ assertionResponse }),
        });

        if (!verificationResponse.ok) {
          return staleStepUpPrfResult('Failed to verify step-up authentication.');
        }

        const verificationResult = await verificationResponse.json();
        const method =
          verificationResult.method === 'webauthn' ? verificationResult.method : null;
        const success =
          verificationResult.message === 'Success' &&
          verificationResult.fresh === true &&
          method === 'webauthn';

        return {
          success,
          fresh: Boolean(verificationResult.fresh),
          method,
          verifiedAt: verificationResult.verifiedAt ?? null,
          expiresAt: verificationResult.expiresAt ?? null,
          maxAgeSeconds: verificationResult.maxAgeSeconds ?? 0,
          message: success
            ? 'Step-up authentication succeeded.'
            : (verificationResult.message ?? 'Step-up authentication failed.'),
          credentialId: prf.credentialId,
          prf,
        };
      } catch {
        console.error('Step-up authentication error.');
        return staleStepUpPrfResult('Step-up authentication failed.');
      }
    },

    getTotpStatus: () =>
      fetchWithAuth(`/totp/status`, {
        method: 'GET',
      }),

    startTotpEnrollment: () =>
      fetchWithAuth(`/totp/enroll/start`, {
        method: 'POST',
      }),

    verifyTotpEnrollment: code =>
      fetchWithAuth(`/totp/enroll/verify`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    disableTotp: code =>
      fetchWithAuth(`/totp/disable`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    verifyStepUpWithTotp: async code => {
      const response = await fetchWithAuth(`/totp/verify-mfa`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        return staleStepUpResult('Failed to verify step-up authentication.');
      }

      try {
        const verificationResult = await response.json();
        const method =
          verificationResult.method === 'totp' ? verificationResult.method : null;
        const success =
          verificationResult.message === 'Success' &&
          verificationResult.fresh === true &&
          method === 'totp';

        return {
          success,
          fresh: Boolean(verificationResult.fresh),
          method,
          verifiedAt: verificationResult.verifiedAt ?? null,
          expiresAt: verificationResult.expiresAt ?? null,
          maxAgeSeconds: verificationResult.maxAgeSeconds ?? 0,
          message: success
            ? 'Step-up authentication succeeded.'
            : (verificationResult.message ?? 'Step-up authentication failed.'),
        };
      } catch {
        console.error('Step-up authentication error.');
        return staleStepUpResult('Step-up authentication failed.');
      }
    },

    updateCredential: input =>
      fetchWithAuth(`users/credentials`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),

    deleteCredential: id =>
      fetchWithAuth(`users/credentials`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }),

    listOrganizations: () =>
      fetchWithAuth(`/organizations`, {
        method: 'GET',
      }),

    createOrganization: input =>
      fetchWithAuth(`/organizations`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    getOrganization: organizationId =>
      fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}`, {
        method: 'GET',
      }),

    updateOrganization: (organizationId, input) =>
      fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),

    switchOrganization: organizationId =>
      fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}/switch`, {
        method: 'POST',
      }),

    listOrganizationMembers: organizationId =>
      fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}/members`, {
        method: 'GET',
      }),

    addOrganizationMember: (organizationId, input) =>
      fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}/members`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    updateOrganizationMember: (organizationId, userId, input) =>
      fetchWithAuth(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        }
      ),

    removeOrganizationMember: (organizationId, userId) =>
      fetchWithAuth(
        `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        {
          method: 'DELETE',
        }
      ),
  };
};
