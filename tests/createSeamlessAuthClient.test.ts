/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createSeamlessAuthClient } from '../src/client/createSeamlessAuthClient';
import { createFetchWithAuth } from '../src/fetchWithAuth';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

jest.mock('../src/fetchWithAuth');
jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: jest.fn(),
  startRegistration: jest.fn(),
  browserSupportsWebAuthn: jest.fn(() => true),
  base64URLStringToBuffer: jest.fn((value: string) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    return Uint8Array.from(Buffer.from(padded, 'base64')).buffer;
  }),
  bufferToBase64URLString: jest.fn((value: ArrayBuffer) =>
    Buffer.from(value)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
  ),
  WebAuthnError: class WebAuthnError extends Error {
    name = 'WebAuthnError';
  },
}));

const mockFetchWithAuth = jest.fn();

(createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuth);

describe('createSeamlessAuthClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchWithAuth.mockReset();
    (startAuthentication as jest.Mock).mockReset();
    (startRegistration as jest.Mock).mockReset();
    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuth);
  });

  it('forwards login requests through the shared auth fetch helper', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValueOnce(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(
      client.login({ identifier: 'test@example.com', passkeyAvailable: true })
    ).resolves.toBe(response);

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: 'test@example.com',
        passkeyAvailable: true,
      }),
    });
  });

  it('uses explicit logout endpoints for current and all sessions', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValue(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.logout()).resolves.toBe(response);
    await expect(client.logout({ scope: 'all_sessions' })).resolves.toBe(response);
    await expect(client.logoutAllSessions()).resolves.toBe(response);

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(1, '/logout', {
      method: 'DELETE',
    });
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(2, '/logout/all', {
      method: 'DELETE',
    });
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(3, '/logout/all', {
      method: 'DELETE',
    });
  });

  it('uses login-specific phone OTP endpoints', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValue(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.requestLoginPhoneOtp()).resolves.toBe(response);
    await expect(client.verifyLoginPhoneOtp('123456')).resolves.toBe(response);

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      1,
      '/otp/generate-login-phone-otp',
      {
        method: 'GET',
      }
    );
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      2,
      '/otp/verify-login-phone-otp',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ verificationToken: '123456' }),
        credentials: 'include',
      })
    );
  });

  it('uses login-specific email OTP endpoints', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValue(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.requestLoginEmailOtp()).resolves.toBe(response);
    await expect(client.verifyLoginEmailOtp('ABCDEF')).resolves.toBe(response);

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      1,
      '/otp/generate-login-email-otp',
      expect.objectContaining({ method: 'GET' })
    );
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      2,
      '/otp/verify-login-email-otp',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ verificationToken: 'ABCDEF' }),
        credentials: 'include',
      })
    );
  });

  it('uses organization endpoints', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValue(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.listOrganizations()).resolves.toBe(response);
    await expect(client.createOrganization({ name: 'Acme' })).resolves.toBe(response);
    await expect(client.switchOrganization('org 1')).resolves.toBe(response);
    await expect(
      client.addOrganizationMember('org 1', { email: 'member@example.com' })
    ).resolves.toBe(response);

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(1, '/organizations', {
      method: 'GET',
    });
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(2, '/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme' }),
    });
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      3,
      '/organizations/org%201/switch',
      { method: 'POST' }
    );
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      4,
      '/organizations/org%201/members',
      {
        method: 'POST',
        body: JSON.stringify({ email: 'member@example.com' }),
      }
    );
  });

  it('uses OAuth login endpoints', async () => {
    const providersResult = {
      providers: [{ id: 'google', name: 'Google', scopes: ['openid', 'email'] }],
    };
    const startResult = {
      provider: providersResult.providers[0],
      state: 'state',
      authorizationUrl: 'https://accounts.example.com/auth',
    };
    const finishResponse = { ok: true };

    mockFetchWithAuth
      .mockResolvedValueOnce({ ok: true, json: async () => providersResult })
      .mockResolvedValueOnce({ ok: true, json: async () => startResult })
      .mockResolvedValueOnce(finishResponse);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.listOAuthProviders()).resolves.toEqual(providersResult);
    await expect(
      client.startOAuthLogin({
        providerId: 'google',
        redirectUri: 'https://app.example.com/oauth/callback',
        returnTo: 'https://app.example.com/dashboard',
      })
    ).resolves.toEqual(startResult);
    await expect(
      client.finishOAuthLogin({
        providerId: 'google',
        code: 'code',
        state: 'state',
      })
    ).resolves.toBe(finishResponse);

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(1, '/oauth/providers', {
      method: 'GET',
    });
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(2, '/oauth/google/start', {
      method: 'POST',
      body: JSON.stringify({
        redirectUri: 'https://app.example.com/oauth/callback',
        returnTo: 'https://app.example.com/dashboard',
      }),
    });
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(3, '/oauth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'code', state: 'state' }),
    });
  });

  it('returns a successful passkey login result when both WebAuthn steps succeed', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'challenge' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success', mfaLogin: false }),
      });
    (startAuthentication as jest.Mock).mockResolvedValueOnce({ credential: 'assertion' });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.loginWithPasskey()).resolves.toEqual({
      success: true,
      mfaRequired: false,
      message: 'Passkey login succeeded.',
    });
  });

  it('returns passkey login PRF output without sending it to verification', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          challenge: 'challenge',
          extensions: {
            prf: {
              eval: {
                first: 'AQIDBA',
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success', mfaLogin: false }),
      });
    (startAuthentication as jest.Mock).mockResolvedValueOnce({
      id: 'cred-prf',
      rawId: 'cred-prf',
      response: {
        authenticatorData: 'auth-data',
        clientDataJSON: 'client-data',
        signature: 'sig',
      },
      type: 'public-key',
      clientExtensionResults: {
        prf: {
          results: {
            first: Uint8Array.from([1, 2, 3, 4]).buffer,
          },
        },
      },
    });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    const result = await client.loginWithPasskey({
      prf: { salt: Uint8Array.from([1, 2, 3, 4]) },
    });

    expect(result.success).toBe(true);
    expect(result.prf?.credentialId).toBe('cred-prf');
    expect(result.prf?.outputBase64url).toBe('AQIDBA');

    const finishBody = (mockFetchWithAuth.mock.calls[1][1] as RequestInit).body as string;
    expect(finishBody).not.toContain('AQIDBA');
    expect(
      JSON.parse(finishBody).assertionResponse.clientExtensionResults.prf.results
    ).toBeUndefined();
  });

  it('returns a successful passkey registration result when registration completes', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'challenge' }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });
    (startRegistration as jest.Mock).mockResolvedValueOnce({ id: 'cred' });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(
      client.registerPasskey({
        friendlyName: 'My Laptop',
        platform: 'mac',
        browser: 'chrome',
        deviceInfo: 'mac • chrome',
      })
    ).resolves.toEqual({
      success: true,
      message: 'Passkey registered successfully.',
      credentialId: 'cred',
      prfCapable: false,
    });
  });

  it('requests PRF-capable registration and reports capability', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'challenge', extensions: { prf: {} } }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });
    (startRegistration as jest.Mock).mockResolvedValueOnce({
      id: 'cred-prf',
      clientExtensionResults: { prf: { enabled: true } },
    });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(
      client.registerPasskey({
        metadata: {
          friendlyName: 'My Laptop',
          platform: 'mac',
          browser: 'chrome',
          deviceInfo: 'mac chrome',
        },
        requirePrf: true,
      })
    ).resolves.toEqual({
      success: true,
      message: 'Passkey registered successfully.',
      credentialId: 'cred-prf',
      prfCapable: true,
    });

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      1,
      '/webAuthn/register/start?requirePrf=true',
      expect.objectContaining({ method: 'GET' })
    );
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(
      2,
      '/webAuthn/register/finish',
      expect.objectContaining({
        body: JSON.stringify({
          attestationResponse: {
            id: 'cred-prf',
            clientExtensionResults: { prf: { enabled: true } },
          },
          metadata: {
            friendlyName: 'My Laptop',
            platform: 'mac',
            browser: 'chrome',
            deviceInfo: 'mac chrome',
            prfCapable: true,
          },
        }),
      })
    );
  });

  it('forwards step-up status requests through the shared auth fetch helper', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValueOnce(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.getStepUpStatus()).resolves.toBe(response);

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/step-up/status', {
      method: 'GET',
    });
  });

  it('returns a successful step-up result when WebAuthn verification completes', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'challenge' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Success',
          fresh: true,
          method: 'webauthn',
          verifiedAt: '2026-05-15T12:00:00.000Z',
          expiresAt: '2026-05-15T12:05:00.000Z',
          maxAgeSeconds: 300,
        }),
      });
    (startAuthentication as jest.Mock).mockResolvedValueOnce({ credential: 'assertion' });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.verifyStepUpWithPasskey()).resolves.toEqual({
      success: true,
      fresh: true,
      method: 'webauthn',
      verifiedAt: '2026-05-15T12:00:00.000Z',
      expiresAt: '2026-05-15T12:05:00.000Z',
      maxAgeSeconds: 300,
      message: 'Step-up authentication succeeded.',
    });

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(1, '/step-up/webauthn/start', {
      method: 'POST',
    });
    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(2, '/step-up/webauthn/finish', {
      method: 'POST',
      body: JSON.stringify({ assertionResponse: { credential: 'assertion' } }),
    });
  });

  it('returns a stale step-up result when challenge creation fails', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({ ok: false });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    await expect(client.verifyStepUpWithPasskey()).resolves.toEqual({
      success: false,
      fresh: false,
      method: null,
      verifiedAt: null,
      expiresAt: null,
      maxAgeSeconds: 0,
      message: 'Failed to start step-up authentication.',
    });
  });

  it('performs PRF step-up without sending PRF output to the API', async () => {
    const salt = Uint8Array.from(Array.from({ length: 32 }, (_, index) => index + 1));

    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          challenge: 'challenge',
          extensions: {
            prf: {
              eval: {
                first: 'AQIDBA',
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Success',
          fresh: true,
          method: 'webauthn',
          verifiedAt: '2026-05-15T12:00:00.000Z',
          expiresAt: '2026-05-15T12:05:00.000Z',
          maxAgeSeconds: 300,
        }),
      });
    (startAuthentication as jest.Mock).mockResolvedValueOnce({
      id: 'cred-prf',
      rawId: 'cred-prf',
      response: {
        authenticatorData: 'auth-data',
        clientDataJSON: 'client-data',
        signature: 'sig',
      },
      type: 'public-key',
      clientExtensionResults: {
        prf: {
          results: {
            first: Uint8Array.from([1, 2, 3, 4]).buffer,
          },
        },
      },
    });

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
    });

    const result = await client.verifyStepUpWithPasskeyPrf({ salt });

    expect(result.success).toBe(true);
    expect(result.credentialId).toBe('cred-prf');
    expect(result.prf?.outputBase64url).toBe('AQIDBA');
    expect(Array.from(result.prf?.output ?? [])).toEqual([1, 2, 3, 4]);

    expect(mockFetchWithAuth).toHaveBeenNthCalledWith(1, '/step-up/webauthn/start', {
      method: 'POST',
      body: JSON.stringify({
        prf: {
          salt: 'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA',
        },
      }),
    });

    const finishBody = (mockFetchWithAuth.mock.calls[1][1] as RequestInit).body as string;
    expect(finishBody).not.toContain('AQIDBA');
    expect(
      JSON.parse(finishBody).assertionResponse.clientExtensionResults.prf.results
    ).toBeUndefined();
  });
});
