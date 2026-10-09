/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

import { createSeamlessAuth, useSeamlessAuth, type SeamlessAuth } from '../src';
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
  let auth!: SeamlessAuth;

  const Probe = defineComponent({
    setup() {
      auth = useSeamlessAuth();
      return () =>
        h('p', auth.isAuthenticated.value ? `in:${auth.user.value?.email}` : 'out');
    },
  });

  const wrapper = mount(Probe, {
    global: {
      plugins: [createSeamlessAuth({ apiHost, fetch: adapter.fetch, ...config })],
    },
  });

  return { adapter, auth: () => auth, wrapper };
}

beforeEach(() => localStorage.clear());

describe('createSeamlessAuth', () => {
  it('explains how to install it when the plugin is missing', () => {
    const Probe = defineComponent({
      setup() {
        useSeamlessAuth();
        return () => null;
      },
    });
    expect(() => mount(Probe)).toThrow(/createSeamlessAuth/);
  });

  it('reads the session on install and exposes it reactively', async () => {
    const { auth, adapter, wrapper } = setup({ 'GET /users/me': signedIn });

    expect(auth().loading.value).toBe(true);
    expect(wrapper.text()).toBe('out');

    const state = await auth().whenSettled();
    await nextTick();

    expect(state.isAuthenticated).toBe(true);
    expect(wrapper.text()).toBe(`in:${user.email}`);
    expect(auth().user.value).toEqual(user);
    expect(auth().hasSignedInBefore.value).toBe(true);
    expect(auth().credentials.value).toEqual([]);
    expect(auth().organizations.value).toEqual([]);
    expect(auth().activeOrganization.value).toBeNull();
    expect(auth().stepUpStatus.value).toBeNull();
    expect(auth().state.value.loading).toBe(false);

    const [call] = adapter.called('GET', '/users/me');
    const headers = new Headers(call.init.headers);
    expect(call.init.credentials).toBe('include');
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-seamless-auth-transport')).toBe(false);
    expect(Object.keys(sessionStorage)).toEqual([]);
  });

  it('settles signed out and clears on logout', async () => {
    const { auth, wrapper } = setup({
      'GET /users/me': signedIn,
      'DELETE /logout': { body: { message: 'Success' } },
    });
    await auth().whenSettled();
    await auth().logout();
    await nextTick();

    expect(auth().isAuthenticated.value).toBe(false);
    expect(wrapper.text()).toBe('out');
  });

  it('starts settled from a session the server resolved', async () => {
    const { auth, adapter } = setup(
      { 'GET /users/me': signedIn },
      { initialSession: { user } }
    );

    expect(auth().loading.value).toBe(false);
    expect(auth().isAuthenticated.value).toBe(true);
    await flushPromises();
    expect(adapter.called('GET', '/users/me')).toHaveLength(1);
  });

  it('reads login methods and passkey support once', async () => {
    const { auth, adapter } = setup(
      {
        'GET /users/me': signedOut,
        'GET /system-config/public': { body: { loginMethods: ['passkey', 'email_otp'] } },
      },
      { ports: { passkeys: passkeyPort(true) } }
    );

    expect(auth().loginMethods.value).toBeNull();
    const [first, second] = await Promise.all([
      auth().loadLoginMethods(),
      auth().loadLoginMethods(),
    ]);
    expect(first).toEqual(['passkey', 'email_otp']);
    expect(second).toBe(first);
    expect(auth().loginMethodsLoading.value).toBe(false);
    expect(adapter.called('GET', '/system-config/public')).toHaveLength(1);

    expect(await auth().checkPasskeySupport()).toBe(true);
    expect(auth().passkeySupported.value).toBe(true);
    expect(auth().passkeySupportLoading.value).toBe(false);
  });

  it('uses custom paths and sends authorizedFetch only to trusted origins', async () => {
    const { auth, adapter } = setup(
      // The fake adapter strips only /auth, so the custom mount stays in the path.
      { 'GET /identity/users/me': signedIn },
      {
        basePath: '/identity',
        signedInPath: '/home',
        loginPath: '/sign-in',
        trustedOrigins: ['https://data.example.com'],
      }
    );
    await auth().whenSettled();

    expect(String((adapter.fetch as jest.Mock).mock.calls[0][0])).toBe(
      `${apiHost}/identity/users/me`
    );
    expect(auth().signedInPath).toBe('/home');
    expect(auth().loginPath).toBe('/sign-in');
    expect(auth().hasRole('user')).toBe(true);
    expect(auth().hasScopedRole('org:admin')).toBe(true);

    await auth().authorizedFetch('https://data.example.com/x');
    expect(adapter.calls.at(-1)?.init.credentials).toBe('include');
    await expect(auth().authorizedFetch('https://evil.example.com/x')).rejects.toThrow(
      /trustedOrigins/
    );
  });

  it('tears the session down with the app', async () => {
    const { auth, wrapper } = setup({ 'GET /users/me': signedOut });
    await auth().whenSettled();
    const before = auth().state.value;

    wrapper.unmount();
    auth().markSignedIn();

    expect(auth().state.value).toBe(before);
  });
});
