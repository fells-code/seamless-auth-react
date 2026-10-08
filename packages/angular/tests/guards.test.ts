/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { authGuard, guestGuard, provideSeamlessAuth, requireAuth } from '../src';
import { createAdapter, signedIn, signedOut } from './adapter';

@Component({ template: 'page' })
class Page {}

function setup(session: typeof signedIn) {
  const adapter = createAdapter({ 'GET /users/me': session });
  TestBed.configureTestingModule({
    providers: [
      provideSeamlessAuth({ apiHost: 'https://app.example.com', fetch: adapter.fetch }),
      provideRouter([
        { path: '', component: Page, canActivate: [authGuard] },
        {
          path: 'admin',
          component: Page,
          canMatch: [requireAuth({ roles: 'org:owner' })],
        },
        {
          path: 'billing',
          component: Page,
          canActivate: [
            requireAuth({ roles: 'org:owner', forbiddenRedirectTo: '/denied' }),
          ],
        },
        {
          path: 'org',
          component: Page,
          canActivate: [requireAuth({ roles: 'org:admin' })],
        },
        { path: 'login', component: Page, canActivate: [guestGuard] },
        { path: 'denied', component: Page },
        {
          path: 'custom',
          component: Page,
          canActivate: [requireAuth({ redirectTo: '/denied' })],
        },
      ]),
    ],
  });
}

let harness: RouterTestingHarness | null = null;

beforeEach(() => {
  harness = null;
});

async function visit(url: string) {
  harness ??= await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return TestBed.inject(Router).url;
}

describe('guards', () => {
  it('sends a signed-out visitor to the login screen after the session is read', async () => {
    setup(signedOut);
    expect(await visit('/')).toBe('/login');
  });

  it('honours a custom redirect', async () => {
    setup(signedOut);
    expect(await visit('/custom')).toBe('/denied');
  });

  it('admits a signed-in user and keeps them off the login screen', async () => {
    setup(signedIn);
    expect(await visit('/')).toBe('/');
    expect(await visit('/login')).toBe('/');
  });

  it('checks roles, scoped roles included', async () => {
    setup(signedIn);
    expect(await visit('/org')).toBe('/org');
    expect(await visit('/billing')).toBe('/denied');
    // A refused canMatch leaves the URL unmatched, which is the point of it.
    await expect(visit('/admin')).rejects.toThrow(/NG04002/);
  });
});
