/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createSeamlessAuth } from '../src';
import { createKitNavigator, requireAuth, requireGuest } from '../src/kit';
import { createAdapter, signedIn, signedOut } from '../../../test-support/fakeAdapter';
import { goto, page, replaceState } from './kitStubs';

const auth = (session: typeof signedIn) =>
  createSeamlessAuth({
    apiHost: 'https://app.example.com',
    fetch: createAdapter({ 'GET /users/me': session }).fetch,
    signedInPath: '/home',
  });

async function redirectOf(run: () => Promise<void>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (thrown) {
    const location = (thrown as { location?: string }).location;
    if (!location) throw thrown;
    return location;
  }
}

beforeEach(() => {
  goto.mockClear();
  replaceState.mockClear();
  page.url = new URL('http://localhost/app/login');
  page.state = {};
});

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

  it('reads and drops the query without leaving the screen', async () => {
    page.url = new URL('http://localhost/app/verify-magiclink?token=t1');
    const navigator = createKitNavigator(auth(signedOut));

    expect(navigator.query('token')).toBe('t1');
    await navigator.dropQuery();

    expect(replaceState).toHaveBeenCalledWith('/app/verify-magiclink', {});
    expect(goto).not.toHaveBeenCalled();
  });
});

describe('load guards', () => {
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
