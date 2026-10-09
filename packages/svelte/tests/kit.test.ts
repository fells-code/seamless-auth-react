/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { cleanup, render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSeamlessAuth, type SeamlessAuth } from '../src';
import {
  createKitNavigator,
  requireAuth,
  requireGuest,
  type GuardLoadEvent,
} from '../src/kit';
import type { AuthNavigator } from '../src/navigation';
import {
  createAdapter,
  signedIn,
  signedOut,
  user,
} from '../../../test-support/fakeAdapter';
import {
  afterNavigate,
  afterNavigateCallbacks,
  goto,
  invalidate,
  page,
} from './kitStubs';
import KitProbe from './KitProbe.svelte';

const auth = (session: typeof signedIn, config: Record<string, unknown> = {}) =>
  createSeamlessAuth({
    apiHost: 'https://app.example.com',
    fetch: createAdapter({ 'GET /users/me': session }).fetch,
    signedInPath: '/home',
    ...config,
  });

const event = () => {
  const depends = vi.fn();
  const load: GuardLoadEvent = { url: new URL('http://localhost/app/orders'), depends };
  return { load, depends };
};

async function redirectOf(guard: (event: GuardLoadEvent) => Promise<void>) {
  try {
    await guard(event().load);
    return null;
  } catch (thrown) {
    const location = (thrown as { location?: string }).location;
    if (!location) throw thrown;
    return location;
  }
}

function mountNavigator(session: SeamlessAuth): AuthNavigator {
  let navigator!: AuthNavigator;
  render(KitProbe, {
    props: { auth: session, onNavigator: created => (navigator = created) },
  });
  return navigator;
}

beforeEach(() => {
  vi.clearAllMocks();
  afterNavigateCallbacks.length = 0;
  page.url = new URL('http://localhost/app/login');
  page.state = {};
});

afterEach(() => cleanup());

describe('createKitNavigator', () => {
  it('navigates through $app/navigation, under the base path', async () => {
    const navigator = createKitNavigator(auth(signedOut), {
      paths: { oauthCallback: '/auth/callback' },
    });

    await navigator.toScreen('verifyEmailOtp', { flow: 'login' });
    expect(goto).toHaveBeenLastCalledWith('/app/verify-email-otp', {
      state: { flow: 'login' },
    });
    expect(navigator.state()).toEqual({ flow: 'login' });

    await navigator.toApp();
    expect(goto).toHaveBeenLastCalledWith('/app/home');

    // A browser path already carries the base, so it is not resolved again.
    await navigator.toLocation('/app/settings');
    expect(goto).toHaveBeenLastCalledWith('/app/settings');

    expect(navigator.absoluteUrl('oauthCallback')).toBe(
      `${window.location.origin}/app/auth/callback`
    );
  });

  it('sends a destination outside the base path to signedInPath', async () => {
    const navigator = createKitNavigator(auth(signedOut));

    await navigator.toLocation('/');
    expect(goto).toHaveBeenLastCalledWith('/app/home');

    goto.mockRejectedValueOnce(new Error('navigation_route_missing'));
    await navigator.toLocation('/app/missing');
    expect(goto).toHaveBeenLastCalledWith('/app/home');
  });

  it('drops the query with a real replace navigation, once Kit has hydrated', async () => {
    page.url = new URL('http://localhost/app/verify-magiclink?token=t1');
    page.state = { flow: 'login' };
    const navigator = mountNavigator(auth(signedOut));
    expect(afterNavigate).toHaveBeenCalled();
    expect(navigator.query('token')).toBe('t1');

    const dropped = navigator.dropQuery();
    await Promise.resolve();
    // Still hydrating: no navigation yet.
    expect(goto).not.toHaveBeenCalled();

    afterNavigateCallbacks.forEach(callback => callback());
    await dropped;

    expect(goto).toHaveBeenCalledWith('/app/verify-magiclink', {
      replaceState: true,
      state: { flow: 'login' },
    });
    expect(page.url.search).toBe('');
  });

  it('re-runs the guards when who is signed in changes', async () => {
    const session = auth(signedIn);
    await session.whenSettled();
    mountNavigator(session);
    flushSync();
    expect(invalidate).not.toHaveBeenCalled();

    await session.logout();
    flushSync();
    expect(invalidate).toHaveBeenCalledWith('seamless-auth:session');
  });
});

describe('load guards', () => {
  it('registers the session dependency and runs on every navigation', async () => {
    const { load, depends } = event();
    await requireGuest(auth(signedOut))(load);
    expect(depends).toHaveBeenCalledWith('seamless-auth:session');
  });

  it('sends a signed-out visitor to the login screen after the session is read', async () => {
    expect(await redirectOf(requireAuth(auth(signedOut)))).toBe('/app/login');
    expect(
      await redirectOf(requireAuth(auth(signedOut), { redirectTo: '/sign-in' }))
    ).toBe('/app/sign-in');
  });

  it('admits a signed-in user and keeps them off the sign-in screens', async () => {
    expect(await redirectOf(requireAuth(auth(signedIn)))).toBeNull();
    expect(await redirectOf(requireGuest(auth(signedIn)))).toBe('/app/home');
    expect(await redirectOf(requireGuest(auth(signedOut)))).toBeNull();
  });

  it('decides from a session the server resolved', async () => {
    expect(
      await redirectOf(requireAuth(auth(signedOut, { initialSession: { user } })))
    ).toBeNull();
  });

  it('checks roles, scoped roles included', async () => {
    expect(
      await redirectOf(requireAuth(auth(signedIn), { roles: 'org:admin' }))
    ).toBeNull();
    expect(await redirectOf(requireAuth(auth(signedIn), { roles: 'org:owner' }))).toBe(
      '/app/home'
    );
    expect(
      await redirectOf(
        requireAuth(auth(signedIn), {
          roles: 'org:owner',
          forbiddenRedirectTo: '/denied',
        })
      )
    ).toBe('/app/denied');
  });
});
