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
  WebAuthnError: class WebAuthnError extends Error {
    name = 'WebAuthnError';
  },
}));

const mockFetchWithAuth = jest.fn();

(createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuth);

describe('createSeamlessAuthClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards login requests through the shared auth fetch helper', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValueOnce(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
      mode: 'server',
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
      mode: 'web',
    });

    await expect(client.loginWithPasskey()).resolves.toEqual({
      success: true,
      mfaRequired: false,
      message: 'Passkey login succeeded.',
    });
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
      mode: 'web',
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
    });
  });

  it('forwards step-up status requests through the shared auth fetch helper', async () => {
    const response = { ok: true };
    mockFetchWithAuth.mockResolvedValueOnce(response);

    const client = createSeamlessAuthClient({
      apiHost: 'https://api.example.com',
      mode: 'server',
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
      mode: 'web',
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
      mode: 'web',
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
});
