/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, take, toArray } from 'rxjs';

import { provideSeamlessAuth, SeamlessAuth, type SeamlessAuthConfig } from '../src';
import {
  createAdapter,
  flush,
  passkeyPort,
  signedIn,
  signedOut,
  user,
} from '../../../test-support/fakeAdapter';

const apiHost = 'https://app.example.com';

function setup(
  routes: Parameters<typeof createAdapter>[0] = {},
  config: Partial<SeamlessAuthConfig> = {},
  platform = 'browser'
) {
  const adapter = createAdapter(routes);
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platform },
      provideSeamlessAuth({ apiHost, fetch: adapter.fetch, ...config }),
    ],
  });
  return { adapter, auth: TestBed.inject(SeamlessAuth) };
}

beforeEach(() => localStorage.clear());

describe('SeamlessAuth', () => {
  it('explains how to configure it when provideSeamlessAuth is missing', () => {
    TestBed.configureTestingModule({});
    expect(() => TestBed.inject(SeamlessAuth)).toThrow(/provideSeamlessAuth/);
  });

  it('reads the session on start and exposes it as signals', async () => {
    const { auth, adapter } = setup({ 'GET /users/me': signedIn });

    expect(auth.loading()).toBe(true);
    const settled = await auth.whenSettled();

    expect(settled.isAuthenticated).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()).toEqual(user);
    expect(auth.loading()).toBe(false);
    expect(auth.hasSignedInBefore()).toBe(true);
    expect(auth.credentials()).toEqual([]);
    expect(auth.organizations()).toEqual([]);
    expect(auth.activeOrganization()).toBeNull();
    expect(auth.stepUpStatus()).toBeNull();
    expect(adapter.called('GET', '/users/me')).toHaveLength(1);
  });

  it('sends only cookies to the adapter, never a token', async () => {
    const { auth, adapter } = setup({ 'GET /users/me': signedIn });
    await auth.whenSettled();

    const [call] = adapter.called('GET', '/users/me');
    const headers = new Headers(call.init.headers);
    expect(call.init.credentials).toBe('include');
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-seamless-auth-transport')).toBe(false);
    expect(Object.keys(sessionStorage)).toEqual([]);
    expect(Object.keys(localStorage)).toEqual(['seamlessauth_seen']);
  });

  it('settles signed out when there is no session', async () => {
    const { auth } = setup({ 'GET /users/me': signedOut });
    const settled = await auth.whenSettled();

    expect(settled.isAuthenticated).toBe(false);
    expect(auth.user()).toBeNull();
    expect(await auth.whenSettled()).toBe(settled);
  });

  it('streams state through observables', async () => {
    const { auth } = setup({
      'GET /users/me': signedIn,
      'DELETE /logout': { body: { message: 'Success' } },
    });

    const authenticated = firstValueFrom(auth.isAuthenticated$.pipe(take(3), toArray()));
    const users = firstValueFrom(auth.user$.pipe(take(2), toArray()));

    await auth.whenSettled();
    await auth.logout();

    expect(await authenticated).toEqual([false, true, false]);
    expect(await users).toEqual([null, user]);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('starts settled from a session the server resolved, then revalidates quietly', async () => {
    const { auth, adapter } = setup(
      { 'GET /users/me': signedIn },
      { initialSession: { user } }
    );

    expect(auth.loading()).toBe(false);
    expect(auth.isAuthenticated()).toBe(true);
    await flush();
    expect(adapter.called('GET', '/users/me')).toHaveLength(1);
  });

  it('does not read the session or browser storage during a server render', async () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    const { auth, adapter } = setup({ 'GET /users/me': signedIn }, {}, 'server');

    await flush();
    expect(adapter.calls).toHaveLength(0);
    expect(auth.loading()).toBe(true);
    expect(auth.hasSignedInBefore()).toBe(false);
    expect(await auth.checkPasskeySupport()).toBe(false);
  });

  it('reads login methods and passkey support once', async () => {
    const { auth, adapter } = setup(
      {
        'GET /users/me': signedOut,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { ports: { passkeys: passkeyPort(true) } }
    );

    expect(auth.loginMethods()).toBeNull();
    expect(auth.loginMethodsLoading()).toBe(true);
    const [first, second] = await Promise.all([
      auth.loadLoginMethods(),
      auth.loadLoginMethods(),
    ]);
    expect(first).toEqual(['passkey', 'email_otp']);
    expect(second).toBe(first);
    expect(auth.loginMethods()).toEqual(['passkey', 'email_otp']);
    expect(auth.loginMethodsLoading()).toBe(false);
    expect(adapter.called('GET', '/system-config/public')).toHaveLength(1);

    expect(await auth.checkPasskeySupport()).toBe(true);
    expect(auth.passkeySupported()).toBe(true);
    expect(auth.passkeySupportLoading()).toBe(false);
  });

  it('accepts a configuration factory and custom paths', async () => {
    const adapter = createAdapter({ 'GET /users/me': signedOut });
    TestBed.configureTestingModule({
      providers: [
        provideSeamlessAuth(() => ({
          apiHost,
          basePath: '/identity',
          fetch: adapter.fetch,
          signedInPath: '/home',
          loginPath: '/sign-in',
        })),
      ],
    });
    const auth = TestBed.inject(SeamlessAuth);
    await auth.whenSettled();

    expect(auth.signedInPath).toBe('/home');
    expect(auth.loginPath).toBe('/sign-in');
    const url = String((adapter.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toBe(`${apiHost}/identity/users/me`);
  });

  it('delegates actions to the session store', async () => {
    const { auth, adapter } = setup({
      'GET /users/me': signedIn,
      'POST /login': { body: { loginMethods: ['passkey'] } },
      'GET /oauth/providers': { body: { providers: [] } },
      'DELETE /logout/all': { body: { message: 'Success' } },
    });
    await auth.whenSettled();

    expect(auth.hasRole('user')).toBe(true);
    expect(auth.hasScopedRole('org:admin')).toBe(true);
    expect((await auth.login('ada@example.com', false)).data).toEqual({
      loginMethods: ['passkey'],
    });
    expect((await auth.listOAuthProviders()).data).toEqual({ providers: [] });

    const response = await auth.authorizedFetch(`${apiHost}/api/things`);
    expect(response.status).toBe(404);
    expect(adapter.calls.at(-1)?.init.credentials).toBe('include');

    await auth.logoutAllSessions();
    expect(auth.isAuthenticated()).toBe(false);
    auth.markSignedIn();
    expect(auth.hasSignedInBefore()).toBe(true);
    expect(auth.client).toBeDefined();
    expect(auth.ports.passkeys).toBeDefined();
  });

  it('settles a waiting guard when the injector is destroyed first', async () => {
    const { auth } = setup({
      'GET /users/me': () => new Promise(() => undefined) as never,
    });
    const waiting = auth.whenSettled();

    TestBed.resetTestingModule();

    await expect(waiting).resolves.toMatchObject({ loading: true });
  });

  it('tears the store down with its injector', async () => {
    const { auth } = setup({ 'GET /users/me': signedOut });
    await auth.whenSettled();
    const values: boolean[] = [];
    const subscription = auth.isAuthenticated$.subscribe(value => values.push(value));

    TestBed.resetTestingModule();
    auth.markSignedIn();

    expect(values).toEqual([false]);
    subscription.unsubscribe();
  });
});
