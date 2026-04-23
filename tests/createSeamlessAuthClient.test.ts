/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createSeamlessAuthClient } from '../src/client/createSeamlessAuthClient';
import { createFetchWithAuth } from '../src/fetchWithAuth';
import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

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
});
