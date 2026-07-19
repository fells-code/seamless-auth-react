/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnAvailable,
} from '@/client/webauthnSupport';

jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: jest.fn(),
}));

const mockBrowserSupportsWebAuthn = browserSupportsWebAuthn as jest.Mock;

describe('isWebAuthnAvailable', () => {
  const originalPublicKeyCredential = (global as any).PublicKeyCredential;
  const originalIsSecureContext = window.isSecureContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowserSupportsWebAuthn.mockReturnValue(true);
    (global as any).PublicKeyCredential = function PublicKeyCredential() {};
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: { get: jest.fn() },
    });
  });

  afterEach(() => {
    (global as any).PublicKeyCredential = originalPublicKeyCredential;
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalIsSecureContext,
    });
  });

  it('returns true when WebAuthn is usable in a secure context', () => {
    expect(isWebAuthnAvailable()).toBe(true);
  });

  it('returns false when the browser does not support WebAuthn', () => {
    mockBrowserSupportsWebAuthn.mockReturnValue(false);
    expect(isWebAuthnAvailable()).toBe(false);
  });

  it('returns false in an insecure context', () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    expect(isWebAuthnAvailable()).toBe(false);
  });

  it('returns false when PublicKeyCredential is missing', () => {
    delete (global as any).PublicKeyCredential;
    expect(isWebAuthnAvailable()).toBe(false);
  });
});

describe('isPlatformAuthenticatorAvailable', () => {
  const originalPublicKeyCredential = (global as any).PublicKeyCredential;

  afterEach(() => {
    (global as any).PublicKeyCredential = originalPublicKeyCredential;
    jest.restoreAllMocks();
  });

  it('resolves the platform authenticator result', async () => {
    (global as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true),
    };
    await expect(isPlatformAuthenticatorAvailable()).resolves.toBe(true);
  });

  it('returns false and logs when the check throws', async () => {
    (global as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: jest
        .fn()
        .mockRejectedValue(new Error('boom')),
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(isPlatformAuthenticatorAvailable()).resolves.toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error checking passkey support.')
    );
  });

  it('returns false when PublicKeyCredential is missing', async () => {
    delete (global as any).PublicKeyCredential;
    await expect(isPlatformAuthenticatorAvailable()).resolves.toBe(false);
  });
});
