/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  WebAuthnError,
} from '@simplewebauthn/browser';

import { createFetchWithAuth } from '../fetchWithAuth';
import { Credential, Organization, OrganizationMembership, User } from '../types';
import { requestResult, resultError, resultOf, type SeamlessAuthResult } from './result';
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

/** Response body for a single membership mutation. */
export interface OrganizationMembershipResult {
  membership: OrganizationMembership;
}

/**
 * Response body when the active organization changes. The server also returns
 * session material here, which this SDK deliberately does not surface: sessions
 * are carried by cookies, so adopters have no reason to handle raw tokens.
 */
export interface OrganizationSwitchResult {
  message: string;
  organizationId: string;
  organization: Organization;
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

/** Response body for endpoints that only acknowledge the request. */
export interface MessageResult {
  message: string;
}

/** Payload returned by a completed passkey login. */
export interface PasskeyLoginData {
  prf?: PasskeyPrfResult;
}

/** Payload returned by a completed passkey registration. */
export interface PasskeyRegistrationData {
  credentialId: string;
  prfCapable: boolean;
}

/** Response body returned when credential metadata is updated. */
export interface CredentialUpdateResult {
  message: string;
  credential: Credential;
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

export interface PasskeyLoginOptions {
  prf?: PasskeyPrfInput;
}

/** Step-up payload that also carries the PRF output for the caller. */
export interface StepUpPrfData extends StepUpStatus {
  credentialId: string;
  prf: PasskeyPrfResult;
}

export type LogoutScope = 'current_session' | 'all_sessions';

export interface LogoutOptions {
  scope?: LogoutScope;
}

/**
 * Headless auth client.
 *
 * Every request resolves to a `SeamlessAuthResult`: check `error` first, then
 * read `data`. Nothing here throws for an HTTP or transport failure.
 * `isPasskeyPrfSupported` is the one exception, since it is a local capability
 * check rather than a request.
 */
export interface SeamlessAuthClient {
  getCurrentUser: () => Promise<SeamlessAuthResult<CurrentUserResult>>;
  login: (input: LoginInput) => Promise<SeamlessAuthResult<LoginStartResult>>;
  loginWithPasskey: (
    options?: PasskeyLoginOptions
  ) => Promise<SeamlessAuthResult<PasskeyLoginData>>;
  logout: (options?: LogoutOptions) => Promise<SeamlessAuthResult<MessageResult>>;
  logoutAllSessions: () => Promise<SeamlessAuthResult<MessageResult>>;
  deleteUser: () => Promise<SeamlessAuthResult<MessageResult>>;
  register: (input: RegisterInput) => Promise<SeamlessAuthResult<MessageResult>>;
  requestPhoneOtp: () => Promise<SeamlessAuthResult<MessageResult>>;
  verifyPhoneOtp: (
    verificationToken: string
  ) => Promise<SeamlessAuthResult<MessageResult>>;
  requestLoginPhoneOtp: () => Promise<SeamlessAuthResult<MessageResult>>;
  verifyLoginPhoneOtp: (
    verificationToken: string
  ) => Promise<SeamlessAuthResult<MessageResult>>;
  requestEmailOtp: () => Promise<SeamlessAuthResult<MessageResult>>;
  verifyEmailOtp: (
    verificationToken: string
  ) => Promise<SeamlessAuthResult<MessageResult>>;
  requestLoginEmailOtp: () => Promise<SeamlessAuthResult<MessageResult>>;
  verifyLoginEmailOtp: (
    verificationToken: string
  ) => Promise<SeamlessAuthResult<MessageResult>>;
  requestMagicLink: () => Promise<SeamlessAuthResult<MessageResult>>;
  checkMagicLink: () => Promise<SeamlessAuthResult<MessageResult>>;
  verifyMagicLink: (token: string) => Promise<SeamlessAuthResult<MessageResult>>;
  listOAuthProviders: () => Promise<SeamlessAuthResult<OAuthProvidersResult>>;
  startOAuthLogin: (
    input: StartOAuthLoginInput
  ) => Promise<SeamlessAuthResult<StartOAuthLoginResult>>;
  finishOAuthLogin: (
    input: FinishOAuthLoginInput
  ) => Promise<SeamlessAuthResult<MessageResult>>;
  registerPasskey: (
    input: PasskeyMetadata | RegisterPasskeyOptions
  ) => Promise<SeamlessAuthResult<PasskeyRegistrationData>>;
  isPasskeyPrfSupported: () => Promise<boolean>;
  getStepUpStatus: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskey: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskeyPrf: (
    input: PasskeyPrfInput
  ) => Promise<SeamlessAuthResult<StepUpPrfData>>;
  getTotpStatus: () => Promise<SeamlessAuthResult<TotpStatus>>;
  startTotpEnrollment: () => Promise<SeamlessAuthResult<TotpEnrollmentStartResult>>;
  verifyTotpEnrollment: (code: string) => Promise<SeamlessAuthResult<MessageResult>>;
  disableTotp: (code: string) => Promise<SeamlessAuthResult<MessageResult>>;
  verifyStepUpWithTotp: (code: string) => Promise<SeamlessAuthResult<StepUpStatus>>;
  updateCredential: (input: {
    id: string;
    friendlyName: string | null;
  }) => Promise<SeamlessAuthResult<CredentialUpdateResult>>;
  deleteCredential: (id: string) => Promise<SeamlessAuthResult<MessageResult>>;
  listOrganizations: () => Promise<SeamlessAuthResult<OrganizationsResult>>;
  createOrganization: (
    input: CreateOrganizationInput
  ) => Promise<SeamlessAuthResult<OrganizationResult>>;
  getOrganization: (
    organizationId: string
  ) => Promise<SeamlessAuthResult<OrganizationResult>>;
  updateOrganization: (
    organizationId: string,
    input: UpdateOrganizationInput
  ) => Promise<SeamlessAuthResult<OrganizationResult>>;
  switchOrganization: (
    organizationId: string
  ) => Promise<SeamlessAuthResult<OrganizationSwitchResult>>;
  listOrganizationMembers: (
    organizationId: string
  ) => Promise<SeamlessAuthResult<OrganizationMembersResult>>;
  addOrganizationMember: (
    organizationId: string,
    input: OrganizationMemberInput
  ) => Promise<SeamlessAuthResult<OrganizationMembershipResult>>;
  updateOrganizationMember: (
    organizationId: string,
    userId: string,
    input: OrganizationMemberUpdateInput
  ) => Promise<SeamlessAuthResult<OrganizationMembershipResult>>;
  removeOrganizationMember: (
    organizationId: string,
    userId: string
  ) => Promise<SeamlessAuthResult<MessageResult>>;
}

type StepUpPayload = Partial<StepUpStatus> & { message?: string };

/**
 * A 200 from the step-up endpoints does not by itself mean the user verified.
 * The payload still has to report a fresh verification by the expected method,
 * so anything else is surfaced as a failure result.
 */
function toStepUpStatus(
  payload: StepUpPayload,
  expectedMethod: StepUpMethod
): SeamlessAuthResult<StepUpStatus> {
  const method = payload.method === expectedMethod ? payload.method : null;
  const verified =
    payload.message === 'Success' && payload.fresh === true && method !== null;

  if (!verified) {
    return resultError(payload.message ?? 'Step-up authentication failed.');
  }

  return resultOf({
    fresh: true,
    method,
    verifiedAt: payload.verifiedAt ?? null,
    expiresAt: payload.expiresAt ?? null,
    maxAgeSeconds: payload.maxAgeSeconds ?? 0,
  });
}

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
      requestResult<CurrentUserResult>(
        fetchWithAuth(`users/me`, { method: 'GET' }),
        'Failed to load the current user.'
      ),

    login: input =>
      requestResult<LoginStartResult>(
        fetchWithAuth(`/login`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        'Failed to start sign-in.'
      ),

    loginWithPasskey: async optionsInput => {
      const started = await requestResult<PublicKeyCredentialRequestOptionsJSON>(
        fetchWithAuth(`/webAuthn/login/start`, {
          ...buildAssertionStartInit(optionsInput?.prf),
        }),
        'Failed to start passkey login.'
      );

      if (started.error) {
        return started as SeamlessAuthResult<PasskeyLoginData>;
      }

      let prf: PasskeyPrfResult | null;
      let assertionResponse: AuthenticationResponseJSON;

      try {
        const credential = (await startAuthentication({
          optionsJSON: preparePrfRequestOptions(started.data),
        })) as AuthenticationResponseJSON;
        prf = extractPasskeyPrfResult(credential);
        assertionResponse = stripPrfResultsFromAssertion(credential);
      } catch {
        // Typically a cancelled or unsupported authenticator prompt.
        console.error('Passkey login error.');
        return resultError('Passkey login failed.');
      }

      const verified = await requestResult<MessageResult>(
        fetchWithAuth(`/webAuthn/login/finish`, {
          method: 'POST',
          body: JSON.stringify({ assertionResponse }),
        }),
        'Failed to verify passkey.'
      );

      if (verified.error) {
        return verified as SeamlessAuthResult<PasskeyLoginData>;
      }

      if (verified.data?.message !== 'Success') {
        return resultError(verified.data?.message ?? 'Passkey login failed.');
      }

      return resultOf(prf ? { prf } : {});
    },

    logout: (options = {}) =>
      requestResult<MessageResult>(
        fetchWithAuth(options.scope === 'all_sessions' ? `/logout/all` : `/logout`, {
          method: 'DELETE',
        }),
        'Failed to sign out.'
      ),

    logoutAllSessions: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/logout/all`, { method: 'DELETE' }),
        'Failed to sign out of all sessions.'
      ),

    deleteUser: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/users/delete`, { method: 'DELETE' }),
        'Failed to delete the account.'
      ),

    register: input =>
      requestResult<MessageResult>(
        fetchWithAuth(`/registration/register`, {
          method: 'POST',
          body: JSON.stringify({
            email: input.email,
            phone: input.phone,
            ...(input.bootstrapToken ? { bootstrapToken: input.bootstrapToken } : {}),
          }),
        }),
        'Failed to register.'
      ),

    requestPhoneOtp: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/generate-phone-otp`, { method: 'GET' }),
        'Failed to send the SMS code.'
      ),

    verifyPhoneOtp: verificationToken =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/verify-phone-otp`, {
          method: 'POST',
          body: JSON.stringify({ verificationToken }),
        }),
        'Failed to verify the SMS code.'
      ),

    requestLoginPhoneOtp: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/generate-login-phone-otp`, { method: 'GET' }),
        'Failed to send the SMS code.'
      ),

    verifyLoginPhoneOtp: verificationToken =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/verify-login-phone-otp`, {
          method: 'POST',
          body: JSON.stringify({ verificationToken }),
        }),
        'Failed to verify the SMS code.'
      ),

    requestEmailOtp: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/generate-email-otp`, { method: 'GET' }),
        'Failed to send the email code.'
      ),

    verifyEmailOtp: verificationToken =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/verify-email-otp`, {
          method: 'POST',
          body: JSON.stringify({ verificationToken }),
        }),
        'Failed to verify the email code.'
      ),

    requestLoginEmailOtp: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/generate-login-email-otp`, { method: 'GET' }),
        'Failed to send the email code.'
      ),

    verifyLoginEmailOtp: verificationToken =>
      requestResult<MessageResult>(
        fetchWithAuth(`/otp/verify-login-email-otp`, {
          method: 'POST',
          body: JSON.stringify({ verificationToken }),
        }),
        'Failed to verify the email code.'
      ),

    // Sends an empty JSON body on purpose. The adapter ignores it, but it makes
    // fetchWithAuth declare a JSON content type, which forces a CORS preflight.
    // A bodyless POST is still a simple request and stays reachable cross-site.
    requestMagicLink: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/magic-link`, { method: 'POST', body: JSON.stringify({}) }),
        'Failed to send the magic link.'
      ),

    checkMagicLink: () =>
      requestResult<MessageResult>(
        fetchWithAuth(`/magic-link/check`, { method: 'GET' }),
        'Failed to check the magic link.'
      ),

    verifyMagicLink: token =>
      requestResult<MessageResult>(
        // The token arrives from a link's query string, so it is untrusted
        // input. Encoding keeps it inside its own path segment instead of
        // letting it redirect the request to another endpoint.
        fetchWithAuth(`/magic-link/verify/${encodeURIComponent(token)}`, {
          method: 'GET',
        }),
        'Failed to verify the magic link.'
      ),

    listOAuthProviders: () =>
      requestResult<OAuthProvidersResult>(
        fetchWithAuth(`/oauth/providers`, { method: 'GET' }),
        'Failed to list OAuth providers.'
      ),

    startOAuthLogin: input =>
      requestResult<StartOAuthLoginResult>(
        fetchWithAuth(`/oauth/${encodeURIComponent(input.providerId)}/start`, {
          method: 'POST',
          body: JSON.stringify({
            ...(input.redirectUri ? { redirectUri: input.redirectUri } : {}),
            ...(input.returnTo ? { returnTo: input.returnTo } : {}),
          }),
        }),
        'Failed to start OAuth login.'
      ),

    finishOAuthLogin: input =>
      requestResult<MessageResult>(
        fetchWithAuth(`/oauth/${encodeURIComponent(input.providerId)}/callback`, {
          method: 'POST',
          body: JSON.stringify({
            code: input.code,
            state: input.state,
          }),
        }),
        'Failed to finish OAuth login.'
      ),

    registerPasskey: async input => {
      const registerInput = normalizeRegisterPasskeyInput(input);
      const challenge = await requestResult<PublicKeyCredentialCreationOptionsJSON>(
        fetchWithAuth(buildRegisterStartPath(registerInput), { method: 'GET' }),
        'Failed to fetch passkey registration challenge.'
      );

      if (challenge.error) {
        return challenge as SeamlessAuthResult<PasskeyRegistrationData>;
      }

      let attestationResponse: RegistrationResponseJSON;

      try {
        attestationResponse = await startRegistration({ optionsJSON: challenge.data });
      } catch (error) {
        if (error instanceof WebAuthnError) {
          // The authenticator name is the useful detail here, for example
          // InvalidStateError when the passkey already exists.
          return resultError(error.name);
        }

        console.error('Passkey registration error.');
        return resultError('Passkey registration failed.');
      }

      const prfCapable = getRegistrationPrfCapable(attestationResponse);

      const verified = await requestResult<MessageResult>(
        fetchWithAuth(`/webAuthn/register/finish`, {
          method: 'POST',
          body: JSON.stringify({
            attestationResponse,
            metadata: { ...registerInput.metadata, prfCapable },
          }),
        }),
        'Verification failed.'
      );

      if (verified.error) {
        return verified as SeamlessAuthResult<PasskeyRegistrationData>;
      }

      return resultOf({ credentialId: attestationResponse.id, prfCapable });
    },

    isPasskeyPrfSupported,

    getStepUpStatus: () =>
      requestResult<StepUpStatus>(
        fetchWithAuth(`/step-up/status`, { method: 'GET' }),
        'Failed to load step-up status.'
      ),

    verifyStepUpWithPasskey: async () => {
      const started = await requestResult<PublicKeyCredentialRequestOptionsJSON>(
        fetchWithAuth(`/step-up/webauthn/start`, { method: 'POST' }),
        'Failed to start step-up authentication.'
      );

      if (started.error) {
        return started as SeamlessAuthResult<StepUpStatus>;
      }

      let assertionResponse: AuthenticationResponseJSON;

      try {
        const credential = (await startAuthentication({
          optionsJSON: preparePrfRequestOptions(started.data),
        })) as AuthenticationResponseJSON;
        assertionResponse = stripPrfResultsFromAssertion(credential);
      } catch {
        console.error('Step-up authentication error.');
        return resultError('Step-up authentication failed.');
      }

      const verified = await requestResult<StepUpPayload>(
        fetchWithAuth(`/step-up/webauthn/finish`, {
          method: 'POST',
          body: JSON.stringify({ assertionResponse }),
        }),
        'Failed to verify step-up authentication.'
      );

      if (verified.error) {
        return verified as SeamlessAuthResult<StepUpStatus>;
      }

      return toStepUpStatus(verified.data ?? {}, 'webauthn');
    },

    verifyStepUpWithPasskeyPrf: async input => {
      const started = await requestResult<PublicKeyCredentialRequestOptionsJSON>(
        fetchWithAuth(`/step-up/webauthn/start`, {
          ...buildAssertionStartInit(input),
        }),
        'Failed to start step-up authentication.'
      );

      if (started.error) {
        return started as SeamlessAuthResult<StepUpPrfData>;
      }

      let prf: PasskeyPrfResult | null;
      let assertionResponse: AuthenticationResponseJSON;

      try {
        const credential = (await startAuthentication({
          optionsJSON: preparePrfRequestOptions(started.data),
        })) as AuthenticationResponseJSON;
        prf = extractPasskeyPrfResult(credential);
        assertionResponse = stripPrfResultsFromAssertion(credential);
      } catch {
        console.error('Step-up authentication error.');
        return resultError('Step-up authentication failed.');
      }

      if (!prf) {
        return resultError('Passkey did not return PRF output.');
      }

      const verified = await requestResult<StepUpPayload>(
        fetchWithAuth(`/step-up/webauthn/finish`, {
          method: 'POST',
          body: JSON.stringify({ assertionResponse }),
        }),
        'Failed to verify step-up authentication.'
      );

      if (verified.error) {
        return verified as SeamlessAuthResult<StepUpPrfData>;
      }

      const status = toStepUpStatus(verified.data ?? {}, 'webauthn');

      if (status.error) {
        return status as SeamlessAuthResult<StepUpPrfData>;
      }

      return resultOf({ ...status.data, credentialId: prf.credentialId, prf });
    },

    getTotpStatus: () =>
      requestResult<TotpStatus>(
        fetchWithAuth(`/totp/status`, { method: 'GET' }),
        'Failed to load authenticator status.'
      ),

    startTotpEnrollment: () =>
      requestResult<TotpEnrollmentStartResult>(
        fetchWithAuth(`/totp/enroll/start`, { method: 'POST' }),
        'Failed to start authenticator enrollment.'
      ),

    verifyTotpEnrollment: code =>
      requestResult<MessageResult>(
        fetchWithAuth(`/totp/enroll/verify`, {
          method: 'POST',
          body: JSON.stringify({ code }),
        }),
        'Failed to verify the authenticator code.'
      ),

    disableTotp: code =>
      requestResult<MessageResult>(
        fetchWithAuth(`/totp/disable`, {
          method: 'POST',
          body: JSON.stringify({ code }),
        }),
        'Failed to disable the authenticator.'
      ),

    verifyStepUpWithTotp: async code => {
      const verified = await requestResult<StepUpPayload>(
        fetchWithAuth(`/totp/verify-mfa`, {
          method: 'POST',
          body: JSON.stringify({ code }),
        }),
        'Failed to verify step-up authentication.'
      );

      if (verified.error) {
        return verified as SeamlessAuthResult<StepUpStatus>;
      }

      return toStepUpStatus(verified.data ?? {}, 'totp');
    },

    updateCredential: input =>
      requestResult<CredentialUpdateResult>(
        fetchWithAuth(`users/credentials`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        'Failed to update credential.'
      ),

    deleteCredential: id =>
      requestResult<MessageResult>(
        fetchWithAuth(`users/credentials`, {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        }),
        'Failed to delete credential.'
      ),

    listOrganizations: () =>
      requestResult<OrganizationsResult>(
        fetchWithAuth(`/organizations`, { method: 'GET' }),
        'Failed to list organizations.'
      ),

    createOrganization: input =>
      requestResult<OrganizationResult>(
        fetchWithAuth(`/organizations`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        'Failed to create organization.'
      ),

    getOrganization: organizationId =>
      requestResult<OrganizationResult>(
        fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}`, {
          method: 'GET',
        }),
        'Failed to load organization.'
      ),

    updateOrganization: (organizationId, input) =>
      requestResult<OrganizationResult>(
        fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
        'Failed to update organization.'
      ),

    switchOrganization: organizationId =>
      requestResult<OrganizationSwitchResult>(
        fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}/switch`, {
          method: 'POST',
        }),
        'Failed to switch organization.'
      ),

    listOrganizationMembers: organizationId =>
      requestResult<OrganizationMembersResult>(
        fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}/members`, {
          method: 'GET',
        }),
        'Failed to list organization members.'
      ),

    addOrganizationMember: (organizationId, input) =>
      requestResult<OrganizationMembershipResult>(
        fetchWithAuth(`/organizations/${encodeURIComponent(organizationId)}/members`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
        'Failed to add organization member.'
      ),

    updateOrganizationMember: (organizationId, userId, input) =>
      requestResult<OrganizationMembershipResult>(
        fetchWithAuth(
          `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(input),
          }
        ),
        'Failed to update organization member.'
      ),

    removeOrganizationMember: (organizationId, userId) =>
      requestResult<MessageResult>(
        fetchWithAuth(
          `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
          {
            method: 'DELETE',
          }
        ),
        'Failed to remove organization member.'
      ),
  };
};
