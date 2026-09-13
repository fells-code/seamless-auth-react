/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

import { createBrowserPasskeyPort } from '../src/ports/browserPasskeys';
import { createBrowserOAuthRedirect } from '../src/ports/oauthRedirect';
import { isPasskeyCeremonyError, PasskeyCeremonyError } from '../src/ports/passkeys';
import { createMemoryTokenStorage } from '../src/ports/tokenStorage';

jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: jest.fn(),
  startRegistration: jest.fn(),
  browserSupportsWebAuthn: jest.fn(() => true),
}));

describe('createBrowserPasskeyPort', () => {
  it('runs the ceremonies through SimpleWebAuthn with the JSON it was handed', async () => {
    (startRegistration as jest.Mock).mockResolvedValue({ id: 'cred-1' });
    (startAuthentication as jest.Mock).mockResolvedValue({ id: 'cred-1', response: {} });
    const port = createBrowserPasskeyPort();

    const creation = { challenge: 'c', rp: { name: 'x' } } as never;
    const request = { challenge: 'c' } as never;

    await expect(port.create(creation)).resolves.toEqual({ id: 'cred-1' });
    await expect(port.get(request)).resolves.toMatchObject({ id: 'cred-1' });
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: creation });
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: request });
  });

  it('reports support from the browser capability checks', () => {
    const port = createBrowserPasskeyPort();
    expect(typeof port.isSupported()).toBe('boolean');
  });
});

describe('PasskeyCeremonyError', () => {
  it('carries the DOMException name, a code, and the cause', () => {
    const cause = new Error('underlying');
    const error = new PasskeyCeremonyError(
      'NotAllowedError',
      'dismissed',
      'USER_CANCELLED',
      cause
    );

    expect(error.name).toBe('NotAllowedError');
    expect(error.code).toBe('USER_CANCELLED');
    expect(error.message).toBe('dismissed');
    expect(error.cause).toBe(cause);
    expect(isPasskeyCeremonyError(error)).toBe(true);
  });

  it('defaults the code to the name', () => {
    expect(new PasskeyCeremonyError('InvalidStateError', 'exists').code).toBe(
      'InvalidStateError'
    );
  });

  it('recognises the shape SimpleWebAuthn throws and nothing looser', () => {
    const webauthnShaped = Object.assign(new Error('x'), {
      code: 'ERROR_CEREMONY_ABORTED',
    });
    webauthnShaped.name = 'AbortError';
    expect(isPasskeyCeremonyError(webauthnShaped)).toBe(true);

    expect(isPasskeyCeremonyError(new Error('plain'))).toBe(false);
    expect(isPasskeyCeremonyError({ name: 'NotAllowedError', code: 'x' })).toBe(false);
    expect(isPasskeyCeremonyError(Object.assign(new Error('x'), { code: 'y' }))).toBe(
      false
    );
    expect(isPasskeyCeremonyError(null)).toBe(false);
  });
});

describe('createMemoryTokenStorage', () => {
  it('holds a pair until removed', async () => {
    const storage = createMemoryTokenStorage();

    await expect(storage.get()).resolves.toBeNull();
    await storage.set({ accessToken: 'a', refreshToken: 'r' });
    await expect(storage.get()).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
    await storage.remove();
    await expect(storage.get()).resolves.toBeNull();
  });
});

describe('createBrowserOAuthRedirect', () => {
  it('navigates the page to the provider and reports that it did', async () => {
    const navigate = jest.fn();

    const outcome = await createBrowserOAuthRedirect(navigate).open(
      'https://idp.example.com/authorize?state=s',
      'https://app.example.com/oauth/callback'
    );

    expect(navigate).toHaveBeenCalledWith('https://idp.example.com/authorize?state=s');
    expect(outcome).toEqual({ type: 'navigated' });
  });
});
