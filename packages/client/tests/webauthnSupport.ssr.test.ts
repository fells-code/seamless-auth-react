/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 *
 * @jest-environment node
 */

import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnAvailable,
} from '@/client/webauthnSupport';

jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: jest.fn(() => true),
}));

// Runs under the node environment, where `window` genuinely does not exist.
// jsdom cannot represent this: there the global object is the window and the
// `window` binding is non-configurable, so it cannot be removed.
describe('webauthn support in a server environment', () => {
  it('runs without a window global', () => {
    expect(typeof window).toBe('undefined');
  });

  it('reports no platform authenticator without touching window', async () => {
    await expect(isPlatformAuthenticatorAvailable()).resolves.toBe(false);
  });

  it('reports WebAuthn unavailable without touching window', () => {
    expect(isWebAuthnAvailable()).toBe(false);
  });
});
