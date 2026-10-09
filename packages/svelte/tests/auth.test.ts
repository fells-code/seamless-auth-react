/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';

import { createSeamlessAuth } from '../src';
import {
  createAdapter,
  passkeyPort,
  signedIn,
  signedOut,
  user,
} from '../../../test-support/fakeAdapter';

const apiHost = 'https://app.example.com';

function setup(
  routes: Parameters<typeof createAdapter>[0] = {},
  config: Record<string, unknown> = {}
) {
  const adapter = createAdapter(routes);
  const auth = createSeamlessAuth({ apiHost, fetch: adapter.fetch, ...config });
  return { adapter, auth };
}

beforeEach(() => localStorage.clear());

describe('createSeamlessAuth', () => {
  it('reads the session in the browser and exposes it through runes', async () => {
    const { auth, adapter } = setup({ 'GET /users/me': signedIn });

    expect(auth.loading).toBe(true);
    const state = await auth.whenSettled();
    flushSync();

    expect(state.isAuthenticated).toBe(true);
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user).toEqual(user);
    expect(auth.loading).toBe(false);
    expect(auth.hasSignedInBefore).toBe(true);
    expect(auth.credentials).toEqual([]);
    expect(auth.organizations).toEqual([]);
    expect(auth.activeOrganization).toBeNull();
    expect(auth.stepUpStatus).toBeNull();
    expect(auth.state.loading).toBe(false);

    const [call] = adapter.called('GET', '/users/me');
    const headers = new Headers(call.init.headers);
    expect(call.init.credentials).toBe('include');
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-seamless-auth-transport')).toBe(false);
    expect(Object.keys(sessionStorage)).toEqual([]);
  });

  it('clears on logout', async () => {
    const { auth } = setup({
      'GET /users/me': signedIn,
      'DELETE /logout': { body: { message: 'Success' } },
    });
    await auth.whenSettled();
    await auth.logout();

    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
  });

  it('starts settled from a session the server resolved', async () => {
    const { auth } = setup({ 'GET /users/me': signedIn }, { initialSession: { user } });
    expect(auth.loading).toBe(false);
    expect(auth.isAuthenticated).toBe(true);
  });

  it('reads login methods and passkey support once', async () => {
    const { auth, adapter } = setup(
      {
        'GET /users/me': signedOut,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { ports: { passkeys: passkeyPort(true) } }
    );

    expect(auth.loginMethods).toBeNull();
    const [first, second] = await Promise.all([
      auth.loadLoginMethods(),
      auth.loadLoginMethods(),
    ]);
    expect(first).toEqual(['passkey', 'email_otp']);
    expect(second).toBe(first);
    expect(auth.loginMethodsLoading).toBe(false);
    expect(adapter.called('GET', '/system-config/public')).toHaveLength(1);

    expect(await auth.checkPasskeySupport()).toBe(true);
    expect(auth.passkeySupported).toBe(true);
    expect(auth.passkeySupportLoading).toBe(false);
  });

  it('uses custom paths and sends authorizedFetch only to trusted origins', async () => {
    const { auth, adapter } = setup(
      { 'GET /identity/users/me': signedIn },
      {
        basePath: '/identity',
        signedInPath: '/home',
        loginPath: '/sign-in',
        trustedOrigins: ['https://data.example.com'],
        injectStyles: false,
        cspNonce: 'n',
      }
    );
    await auth.whenSettled();

    expect(auth.signedInPath).toBe('/home');
    expect(auth.loginPath).toBe('/sign-in');
    expect(auth.styles).toEqual({ inject: false, nonce: 'n' });
    expect(auth.hasRole('user')).toBe(true);
    expect(auth.hasScopedRole('org:admin')).toBe(true);
    auth.markSignedIn();

    await auth.authorizedFetch('https://data.example.com/x');
    expect(adapter.calls.at(-1)?.init.credentials).toBe('include');
    await expect(auth.authorizedFetch('https://evil.example.com/x')).rejects.toThrow(
      /trustedOrigins/
    );
  });

  it('settles a waiting guard when the session is destroyed first', async () => {
    const { auth } = setup({ 'GET /users/me': () => undefined });
    const waiting = auth.whenSettled();

    auth.destroy();

    await expect(waiting).resolves.toMatchObject({ loading: true });
  });
});
