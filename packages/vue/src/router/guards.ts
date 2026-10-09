/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { NavigationGuardWithThis, RouteLocationRaw } from 'vue-router';

import { useSeamlessAuth } from '../plugin';

export interface RequireAuthOptions {
  /** Where to send someone who is signed out. Defaults to the configured `loginPath`. */
  redirectTo?: RouteLocationRaw;
  /**
   * Roles the user needs, matched the way the auth API matches them (scoped
   * roles such as `org:admin` included). Any one of a list is enough.
   */
  roles?: string | string[];
  /** Where to send a signed-in user without the role. Left out, navigation is refused. */
  forbiddenRedirectTo?: RouteLocationRaw;
}

/** A guard for `beforeEnter`, or to call from `router.beforeEach`. */
export type SeamlessAuthGuard = NavigationGuardWithThis<undefined>;

/**
 * Admits a signed-in user. Waits for the session to be read first, so a page
 * load on a protected route is not bounced to the login screen while the
 * session is still loading.
 */
export function requireAuth(options: RequireAuthOptions = {}): SeamlessAuthGuard {
  return async () => {
    // vue-router runs guards inside the application's context, so inject works.
    const auth = useSeamlessAuth();
    const state = await auth.whenSettled();

    if (state.loading) {
      // A server render that was not handed the session cannot decide. The
      // browser runs the guard again when the application boots there.
      return true;
    }

    if (!state.isAuthenticated) {
      return options.redirectTo ?? auth.loginPath;
    }

    if (options.roles !== undefined && !auth.hasScopedRole(options.roles)) {
      return options.forbiddenRedirectTo ?? false;
    }

    return true;
  };
}

/**
 * Admits someone who is signed out, and sends a signed-in user to the
 * configured `signedInPath`. For the screens that start a sign-in.
 */
export function requireGuest(
  options: { redirectTo?: RouteLocationRaw } = {}
): SeamlessAuthGuard {
  return async () => {
    const auth = useSeamlessAuth();
    const state = await auth.whenSettled();

    if (state.loading) {
      return true;
    }

    return state.isAuthenticated ? (options.redirectTo ?? auth.signedInPath) : true;
  };
}

/** `requireAuth()` with its defaults. */
export const authGuard: SeamlessAuthGuard = requireAuth();

/** `requireGuest()` with its defaults. */
export const guestGuard: SeamlessAuthGuard = requireGuest();
