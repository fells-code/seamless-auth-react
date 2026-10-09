/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { redirect } from '@sveltejs/kit';
import { afterNavigate, goto } from '$app/navigation';
import { resolve as resolveRoute } from '$app/paths';
import { page } from '$app/state';

import type { SeamlessAuth } from '../auth.svelte.js';
import { authRoutePaths, type AuthNavigator, type AuthScreen } from '../navigation.js';
import { invalidateOnSessionChange, SESSION_DEPENDENCY } from './watch.svelte.js';

// Kit types `resolve` against the application's own route ids, which a library
// cannot know, so it is called as the plain pathname resolver it also is.
const resolve = resolveRoute as unknown as (path: string) => string;

/** The parts of a SvelteKit load event the guards use, in both Kit 2 and 3. */
export interface GuardLoadEvent {
  url: URL;
  depends(...deps: `${string}:${string}`[]): void;
}

export interface KitNavigatorOptions {
  /** Where each bundled screen is mounted, when not at its default path. */
  paths?: Partial<Record<AuthScreen, string>>;
}

/**
 * The bundled screens' navigator for SvelteKit, from `$app/navigation`. Create
 * it while the root layout initialises, so it can also re-run the `load` guards
 * whenever the session changes:
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
  const base = resolve('/').replace(/\/+$/, '');

  // A screen mounts while Kit is still hydrating the first page, before its
  // router has started, and a navigation then fails. The first afterNavigate
  // marks the end of hydration.
  let markReady: () => void = () => undefined;
  const ready = new Promise<void>(resolveReady => {
    markReady = resolveReady;
  });
  try {
    afterNavigate(() => markReady());
    invalidateOnSessionChange(auth);
  } catch {
    // Created outside a component, so there is no hydration to wait for.
    markReady();
  }

  const toApp = (path?: string) => goto(resolve(path ?? auth.signedInPath));

  return {
    toScreen: (screen, state) => goto(pathOf(screen), { state: state ?? {} }),
    toApp,
    // A browser path already carries the base. One outside it (the '/' an OAuth
    // sign-in falls back to, under a base path) is not in this application, so
    // it goes to signedInPath instead.
    toLocation: async browserPath => {
      if (base && browserPath !== base && !browserPath.startsWith(`${base}/`)) {
        return toApp();
      }
      try {
        await goto(browserPath);
      } catch {
        await toApp();
      }
    },
    state: () => (page.state ?? {}) as Record<string, unknown>,
    query: name => page.url.searchParams.get(name),
    // A real replace navigation to the same screen, which stays mounted. Shallow
    // routing would only change the address bar: Kit keeps the old URL in
    // page.url and in the history entry, where Back would bring the secret back.
    dropQuery: async () => {
      await ready;
      // afterNavigate runs just before Kit marks its router started.
      await Promise.resolve();
      await goto(page.url.pathname, { replaceState: true, state: page.state });
    },
    absoluteUrl: screen => new URL(pathOf(screen), window.location.origin).toString(),
  };
}

/**
 * Makes Kit run a guard again on every navigation and whenever the session
 * changes, instead of once per layout. Cheap: a settled session answers at once.
 */
function track(event: GuardLoadEvent) {
  event.depends(SESSION_DEPENDENCY);
  void event.url.pathname;
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
 * bounce a signed-in user, and runs again whenever the session changes. A
 * server render that was not handed an `initialSession` cannot see the session
 * and treats the visitor as signed out, so set `export const ssr = false` on
 * protected routes, which suits a backend-for-frontend application anyway.
 */
export function requireAuth(auth: SeamlessAuth, options: RequireAuthOptions = {}) {
  return async (event: GuardLoadEvent): Promise<void> => {
    track(event);
    const state = await auth.whenSettled();

    if (state.loading || !state.isAuthenticated) {
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
  return async (event: GuardLoadEvent): Promise<void> => {
    track(event);
    const state = await auth.whenSettled();

    if (state.isAuthenticated) {
      redirect(307, resolve(options.redirectTo ?? auth.signedInPath));
    }
  };
}
