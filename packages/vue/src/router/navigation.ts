/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { useRouter } from 'vue-router';

import { useSeamlessAuth } from '../plugin';
import { authRouteName, type AuthScreen } from './paths';

/**
 * How a bundled screen moves. Screens are named routes, so they reach each
 * other by name wherever the application mounted them. Call it in `setup`.
 */
export function useAuthNavigation() {
  const router = useRouter();
  const auth = useSeamlessAuth();

  return {
    /** Another bundled screen, with optional navigation state. */
    toScreen: (screen: AuthScreen, state?: Record<string, string>) =>
      router.push({ name: authRouteName(screen), state }),
    /** Where the application wants a signed-in user, or an in-app path. */
    toApp: (path?: string) => router.push(path ?? auth.signedInPath),
    /**
     * A path as the browser sees it, such as the destination an OAuth sign-in
     * returns. The router's base is part of it, and the router adds its base
     * again, so it is taken off first.
     */
    toLocation: (browserPath: string) => {
      const base = router.options.history.base.replace(/\/+$/, '');
      const inApp =
        base && (browserPath === base || browserPath.startsWith(`${base}/`))
          ? browserPath.slice(base.length) || '/'
          : browserPath;
      return router.push(inApp);
    },
    /** Navigation state the previous screen handed over. */
    state: <T extends object>(): Partial<T> => {
      // The router's own history, so memory and hash history work as web does.
      const state: unknown = router.options.history.state;
      return state && typeof state === 'object' ? (state as Partial<T>) : {};
    },
    /** A screen's absolute URL, for a redirect URI. Honours the router's base. */
    absoluteUrl: (screen: AuthScreen) =>
      new URL(
        router.resolve({ name: authRouteName(screen) }).href,
        window.location.origin
      ).toString(),
    /**
     * Drops the query from the current URL in place. For screens whose query is
     * a one-time secret (a magic link token, an OAuth code), so it does not stay
     * in history or travel in a Referer.
     */
    dropQuery: () =>
      router.replace({ ...router.currentRoute.value, query: {}, hash: '' }),
  };
}
