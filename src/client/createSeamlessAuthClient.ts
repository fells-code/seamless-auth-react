/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  startAuthentication,
  startRegistration,
  type RegistrationResponseJSON,
  WebAuthnError,
} from '@simplewebauthn/browser';

import { AuthMode, createFetchWithAuth } from '../fetchWithAuth';
import { Credential, User } from '../types';

export interface SeamlessAuthClientOptions {
  apiHost: string;
  mode: AuthMode;
}

export interface LoginInput {
  identifier: string;
  passkeyAvailable: boolean;
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
}

export interface PasskeyLoginResult {
  success: boolean;
  mfaRequired: boolean;
  message: string;
}

export interface PasskeyRegistrationResult {
  success: boolean;
  message: string;
}

export interface SeamlessAuthClient {
  getCurrentUser: () => Promise<Response>;
  login: (input: LoginInput) => Promise<Response>;
  loginWithPasskey: () => Promise<PasskeyLoginResult>;
  logout: () => Promise<Response>;
  deleteUser: () => Promise<Response>;
  register: (input: RegisterInput) => Promise<Response>;
  requestPhoneOtp: () => Promise<Response>;
  verifyPhoneOtp: (verificationToken: string) => Promise<Response>;
  requestEmailOtp: () => Promise<Response>;
  verifyEmailOtp: (verificationToken: string) => Promise<Response>;
  requestMagicLink: () => Promise<Response>;
  checkMagicLink: () => Promise<Response>;
  verifyMagicLink: (token: string) => Promise<Response>;
  registerPasskey: (metadata: PasskeyMetadata) => Promise<PasskeyRegistrationResult>;
  updateCredential: (input: { id: string; friendlyName: string | null }) => Promise<Response>;
  deleteCredential: (id: string) => Promise<Response>;
}

export const createSeamlessAuthClient = (
  opts: SeamlessAuthClientOptions
): SeamlessAuthClient => {
  const fetchWithAuth = createFetchWithAuth({
    authMode: opts.mode,
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

    loginWithPasskey: async () => {
      const response = await fetchWithAuth(`/webAuthn/login/start`, {
        method: 'POST',
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
        const credential = await startAuthentication({ optionsJSON: options });

        const verificationResponse = await fetchWithAuth(`/webAuthn/login/finish`, {
          method: 'POST',
          body: JSON.stringify({ assertionResponse: credential }),
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
          };
        }

        return {
          success: false,
          mfaRequired: false,
          message: verificationResult.message ?? 'Passkey login failed.',
        };
      } catch (error) {
        console.error('Passkey login error:', error);
        return {
          success: false,
          mfaRequired: false,
          message: 'Passkey login failed.',
        };
      }
    },

    logout: () =>
      fetchWithAuth(`/logout`, {
        method: 'GET',
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

    registerPasskey: async metadata => {
      const challengeRes = await fetchWithAuth(`/webAuthn/register/start`, {
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

        console.error('Passkey registration error:', error);
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
          metadata,
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
      };
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
  };
};
