/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { redirect } from '@sveltejs/kit';
import { goto, replaceState } from '$app/navigation';
import { resolve as resolveRoute } from '$app/paths';
import { page } from '$app/state';

import type { SeamlessAuth } from '../auth.svelte.js';
import { authRoutePaths, type AuthNavigator, type AuthScreen } from '../navigation.js';

// Kit types `resolve` against the application's own route ids, which a library
// cannot know, so it is called as the plain pathname resolver it also is.
const resolve = resolveRoute as unknown as (path: string) => string;

const isBrowser = () => typeof window !== 'undefined';

export interface KitNavigatorOptions {
  /** Where each bundled screen is mounted, when not at its default path. */
  paths?: Partial<Record<AuthScreen, string>>;
}

/**
 * The bundled screens' navigator for SvelteKit, from `$app/navigation`. Set it
 * once in the root layout:
 *
 * ```svelte
 * setSeamlessAuth(auth);
 * setAuthNavigator(createKitNavigator(auth));
 * ```
 */
export function createKitNavigator(
  auth: SeamlessAuth,
  options: KitNavigatorOptions = {}
): AuthNavigator {
  const pathOf = (screen: AuthScreen) =>
    resolve(options.paths?.[screen] ?? authRoutePaths[screen]);

  return {
    toScreen: (screen, state) => goto(pathOf(screen), { state: state ?? {} }),
    toApp: path => goto(resolve(path ?? auth.signedInPath)),
    // goto takes a path with the base already on it, which a browser path has.
    toLocation: browserPath => goto(browserPath),
    state: () => (page.state ?? {}) as Record<string, unknown>,
    query: name => page.url.searchParams.get(name),
    // Shallow routing: the address changes without a navigation, so the screen
    // is not reloaded and does not read the query again.
    dropQuery: async () => {
      await replaceState(page.url.pathname, page.state);
    },
    absoluteUrl: screen => new URL(pathOf(screen), window.location.origin).toString(),
  };
}

export interface RequireAuthOptions {
  /** Where to send someone who is signed out. Defaults to the configured `loginPath`. */
  redirectTo?: string;
  /**
   * Roles the user needs, matched the way the auth API matches them (scoped
   * roles such as `org:admin` included). Any one of a list is enough.
   */
  roles?: string | string[];
  /** Where to send a signed-in user without the role. Defaults to `signedInPath`. */
  forbiddenRedirectTo?: string;
}

/**
 * A `load` function that admits a signed-in user, for a `+layout.ts` or
 * `+page.ts`:
 *
 * ```ts
 * export const load = requireAuth(auth);
 * ```
 *
 * It waits for the session to be read, so reloading a protected page does not
 * bounce a signed-in user. A server render cannot see the session and treats
 * the visitor as signed out, so set `export const ssr = false` on protected
 * routes, which suits a backend-for-frontend application anyway.
 */
export function requireAuth(auth: SeamlessAuth, options: RequireAuthOptions = {}) {
  return async (): Promise<void> => {
    const state = await auth.whenSettled();

    if (!isBrowser() || state.loading || !state.isAuthenticated) {
      redirect(307, resolve(options.redirectTo ?? auth.loginPath));
    }

    if (options.roles !== undefined && !auth.hasScopedRole(options.roles)) {
      redirect(307, resolve(options.forbiddenRedirectTo ?? auth.signedInPath));
    }
  };
}

/**
 * A `load` function that admits someone who is signed out, and sends a signed-in
 * user to `signedInPath`. For the screens that start a sign-in.
 */
export function requireGuest(auth: SeamlessAuth, options: { redirectTo?: string } = {}) {
  return async (): Promise<void> => {
    const state = await auth.whenSettled();

    if (state.isAuthenticated) {
      redirect(307, resolve(options.redirectTo ?? auth.signedInPath));
    }
  };
}
