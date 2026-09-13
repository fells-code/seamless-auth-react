/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { PasskeyCeremonyError } from '@seamless-auth/client';

import { describeDevice } from '../src/deviceInfo';
import { createNativePasskeyPort } from '../src/ports/nativePasskeys';
import { createSecureStoreTokenStorage } from '../src/ports/secureStoreTokenStorage';
import {
  createWebBrowserOAuthRedirect,
  parseOAuthCallbackUrl,
} from '../src/ports/webBrowserOAuthRedirect';

function fakeSecureStore(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItemAsync: jest.fn(
      async (key: string, _options?: unknown) => items.get(key) ?? null
    ),
    setItemAsync: jest.fn(async (key: string, value: string, _options?: unknown) => {
      items.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string, _options?: unknown) => {
      items.delete(key);
    }),
  };
}

describe('createSecureStoreTokenStorage', () => {
  it('round-trips the pair as one keystore entry', async () => {
    const store = fakeSecureStore();
    const storage = createSecureStoreTokenStorage(store);

    await storage.set({ accessToken: 'a', refreshToken: 'r' });
    expect(store.setItemAsync).toHaveBeenCalledWith(
      'seamless-auth.session',
      JSON.stringify({ accessToken: 'a', refreshToken: 'r' }),
      undefined
    );

    await expect(storage.get()).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });

    await storage.remove();
    await expect(storage.get()).resolves.toBeNull();
  });

  it('uses the configured key and passes store options through', async () => {
    const store = fakeSecureStore();
    const storeOptions = { keychainAccessible: 'whenUnlocked' };
    const storage = createSecureStoreTokenStorage(store, {
      key: 'app.session',
      storeOptions,
    });

    await storage.set({ accessToken: 'a', refreshToken: 'r' });
    await storage.get();
    await storage.remove();

    expect(store.setItemAsync.mock.calls[0][0]).toBe('app.session');
    expect(store.setItemAsync.mock.calls[0][2]).toBe(storeOptions);
    expect(store.getItemAsync).toHaveBeenCalledWith('app.session', storeOptions);
    expect(store.deleteItemAsync).toHaveBeenCalledWith('app.session', storeOptions);
  });

  it('reads anything it cannot parse as no session', async () => {
    const storage = createSecureStoreTokenStorage(
      fakeSecureStore({ 'seamless-auth.session': 'not json' })
    );
    await expect(storage.get()).resolves.toBeNull();

    const partial = createSecureStoreTokenStorage(
      fakeSecureStore({ 'seamless-auth.session': JSON.stringify({ accessToken: 'a' }) })
    );
    await expect(partial.get()).resolves.toBeNull();
  });

  it('never throws when the keystore does', async () => {
    const failing = {
      getItemAsync: jest.fn(async () => {
        throw new Error('locked');
      }),
      setItemAsync: jest.fn(async () => {
        throw new Error('locked');
      }),
      deleteItemAsync: jest.fn(async () => {
        throw new Error('locked');
      }),
    };
    const storage = createSecureStoreTokenStorage(failing);

    await expect(storage.get()).resolves.toBeNull();
    await expect(
      storage.set({ accessToken: 'a', refreshToken: 'r' })
    ).resolves.toBeUndefined();
    await expect(storage.remove()).resolves.toBeUndefined();
  });
});

describe('createNativePasskeyPort', () => {
  const native = () => ({
    isSupported: jest.fn(() => true),
    create: jest.fn(),
    get: jest.fn(),
  });

  it('runs the ceremonies through the native module with the JSON it was handed', async () => {
    const module = native();
    module.create.mockResolvedValue({ id: 'cred-1' });
    module.get.mockResolvedValue({ id: 'cred-1', response: {} });
    const port = createNativePasskeyPort(module);

    const creation = { challenge: 'c' } as never;
    const request = { challenge: 'c' } as never;

    await expect(port.create(creation)).resolves.toEqual({ id: 'cred-1' });
    await expect(port.get(request)).resolves.toMatchObject({ id: 'cred-1' });
    expect(module.create).toHaveBeenCalledWith(creation);
    expect(module.get).toHaveBeenCalledWith(request);
    expect(port.isSupported()).toBe(true);
    await expect(port.isPlatformAuthenticatorAvailable()).resolves.toBe(true);
  });

  it('reports a null result as a dismissed prompt', async () => {
    const module = native();
    module.create.mockResolvedValue(null);
    module.get.mockResolvedValue(null);
    const port = createNativePasskeyPort(module);

    await expect(port.create({} as never)).rejects.toMatchObject({
      name: 'NotAllowedError',
      code: 'NotAllowedError',
    });
    await expect(port.get({} as never)).rejects.toBeInstanceOf(PasskeyCeremonyError);
  });

  it.each([
    [
      { name: 'Error', code: 'UserCancelled', message: 'The user cancelled' },
      'NotAllowedError',
    ],
    [
      { name: 'ASAuthorizationError', code: '1001', message: 'canceled' },
      'NotAllowedError',
    ],
    [
      {
        name: 'Error',
        code: 'CreateCredentialException',
        message: 'credential already exists',
      },
      'InvalidStateError',
    ],
    [
      { name: 'SecurityError', code: 'RP_MISMATCH', message: 'rp id mismatch' },
      'SecurityError',
    ],
  ])('maps a native failure %j onto %s', async (thrown, expectedName) => {
    const module = native();
    module.create.mockRejectedValue(Object.assign(new Error(thrown.message), thrown));
    const port = createNativePasskeyPort(module);

    const error = await port.create({} as never).catch(e => e);

    expect(error).toBeInstanceOf(PasskeyCeremonyError);
    expect(error.name).toBe(expectedName);
    expect(error.code).toBe(thrown.code);
    expect(error.cause).toMatchObject({ message: thrown.message });
  });

  it('keeps an unrecognised failure diagnosable', async () => {
    const module = native();
    module.get.mockRejectedValue('string failure');
    const port = createNativePasskeyPort(module);

    const error = await port.get({} as never).catch(e => e);

    expect(error.name).toBe('UnknownError');
    expect(error.message).toBe('Passkey ceremony failed.');
  });
});

describe('parseOAuthCallbackUrl', () => {
  it('reads code and state from an https callback', () => {
    expect(
      parseOAuthCallbackUrl('https://app.example.com/oauth/callback?code=c1&state=s1#x')
    ).toEqual({ code: 'c1', state: 's1' });
  });

  it('reads code and state from a custom scheme', () => {
    expect(parseOAuthCallbackUrl('roxtarget://oauth/callback?state=s1&code=c1')).toEqual({
      code: 'c1',
      state: 's1',
    });
  });

  it('returns null when either value is missing', () => {
    expect(
      parseOAuthCallbackUrl('https://app.example.com/oauth/callback?code=c1')
    ).toBeNull();
    expect(parseOAuthCallbackUrl('roxtarget://oauth/callback')).toBeNull();
  });
});

describe('createWebBrowserOAuthRedirect', () => {
  it('opens the provider in an auth session and hands the callback back', async () => {
    const browser = {
      openAuthSessionAsync: jest.fn(async () => ({
        type: 'success',
        url: 'roxtarget://oauth/callback?code=c1&state=s1',
      })),
    };
    const options = { preferEphemeralSession: true };

    const outcome = await createWebBrowserOAuthRedirect(browser, options).open(
      'https://idp.example.com/authorize',
      'roxtarget://oauth/callback'
    );

    expect(browser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://idp.example.com/authorize',
      'roxtarget://oauth/callback',
      options
    );
    expect(outcome).toEqual({ type: 'callback', code: 'c1', state: 's1' });
  });

  it.each([
    [{ type: 'cancel' }],
    [{ type: 'dismiss' }],
    [{ type: 'success', url: 'roxtarget://oauth/callback?error=access_denied' }],
  ])('reports %j as cancelled', async result => {
    const browser = { openAuthSessionAsync: jest.fn(async () => result) };

    await expect(
      createWebBrowserOAuthRedirect(browser).open(
        'https://idp.example.com',
        'roxtarget://cb'
      )
    ).resolves.toEqual({ type: 'cancelled' });
  });
});

describe('describeDevice', () => {
  it('describes an iPhone', () => {
    expect(describeDevice({ OS: 'ios', Version: '26.0' })).toEqual({
      friendlyName: 'iOS device',
      platform: 'ios',
      browser: 'native',
      deviceInfo: 'iOS 26.0',
    });
  });

  it('describes an Android device with a chosen name', () => {
    expect(describeDevice({ OS: 'android', Version: 36 }, 'Pixel')).toEqual({
      friendlyName: 'Pixel',
      platform: 'android',
      browser: 'native',
      deviceInfo: 'Android 36',
    });
  });
});
