/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { inject } from '@angular/core';
import {
  Router,
  type CanActivateFn,
  type CanMatchFn,
  type UrlTree,
} from '@angular/router';

import { SeamlessAuth } from './seamless-auth.service';

export interface RequireAuthOptions {
  /** Where to send someone who is signed out. Defaults to the configured `loginPath`. */
  redirectTo?: string;
  /**
   * Roles the user needs, matched the way the auth API matches them (scoped
   * roles such as `org:admin` included). Any one of a list is enough.
   */
  roles?: string | string[];
  /** Where to send a signed-in user without the role. Left out, navigation is refused. */
  forbiddenRedirectTo?: string;
}

/** A guard usable as `canActivate`, `canActivateChild` or `canMatch`. */
export type SeamlessAuthGuard = CanActivateFn & CanMatchFn;

/**
 * Admits a signed-in user. Waits for the session to be read first, so a page
 * load on a protected route is not bounced to the login screen while the
 * session is still loading.
 */
export function requireAuth(options: RequireAuthOptions = {}): SeamlessAuthGuard {
  return async (): Promise<boolean | UrlTree> => {
    const auth = inject(SeamlessAuth);
    const router = inject(Router);
    const state = await auth.whenSettled();

    // A server render that was not handed the session cannot tell, and treats
    // the visitor as signed out: rendering the page could put its data in the
    // response. The browser decides again once the application boots there.
    if (state.loading || !state.isAuthenticated) {
      return router.parseUrl(options.redirectTo ?? auth.loginPath);
    }

    if (options.roles !== undefined && !auth.hasScopedRole(options.roles)) {
      return options.forbiddenRedirectTo
        ? router.parseUrl(options.forbiddenRedirectTo)
        : false;
    }

    return true;
  };
}

/**
 * Admits someone who is signed out, and sends a signed-in user to the
 * configured `signedInPath`. For the sign-in screens.
 */
export function requireGuest(options: { redirectTo?: string } = {}): SeamlessAuthGuard {
  return async (): Promise<boolean | UrlTree> => {
    const auth = inject(SeamlessAuth);
    const router = inject(Router);
    const state = await auth.whenSettled();

    if (state.loading) {
      return true;
    }

    return state.isAuthenticated
      ? router.parseUrl(options.redirectTo ?? auth.signedInPath)
      : true;
  };
}

/** `requireAuth()` with its defaults. */
export const authGuard: SeamlessAuthGuard = requireAuth();

/** `requireGuest()` with its defaults. */
export const guestGuard: SeamlessAuthGuard = requireGuest();
