/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { Location } from '@angular/common';
import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SeamlessAuth } from '@seamless-auth/angular';

import type { AuthRoutePath } from './paths';

/**
 * How a bundled screen moves. Screens are siblings under one parent route, so
 * each one reaches another through that parent. Going through the parent
 * rather than `..` matters for `oauth/callback`, which spans two segments: `..`
 * from there climbs only one. Must be called in an injection context.
 */
export function injectAuthNavigation() {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  const location = inject(Location);
  const auth = inject(SeamlessAuth);

  const screenTree = (path: AuthRoutePath) =>
    router.createUrlTree(path.split('/'), { relativeTo: route.parent ?? route });

  return {
    /** Another bundled screen, with optional navigation state. */
    toScreen: (path: AuthRoutePath, state?: Record<string, unknown>) =>
      router.navigateByUrl(screenTree(path), { state }),
    /** Where the application wants a signed-in user, or an in-app path. */
    toApp: (path?: string, options: { replaceUrl?: boolean } = {}) =>
      router.navigateByUrl(path ?? auth.signedInPath, options),
    /**
     * Drops the query from the current URL in place. For screens whose query is a
     * one-time secret (a magic link token, an OAuth code), so it does not stay in
     * history or travel in a Referer.
     */
    dropQuery: () =>
      router.navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true }),
    /** Navigation state the previous screen handed over. */
    state: <T extends object>(): Partial<T> => {
      const state = location.getState();
      return state && typeof state === 'object' ? (state as Partial<T>) : {};
    },
    /** A screen's absolute URL, for a redirect URI. Honours the base href. */
    absoluteUrl: (path: AuthRoutePath) =>
      new URL(
        location.prepareExternalUrl(router.serializeUrl(screenTree(path))),
        window.location.origin
      ).toString(),
  };
}
