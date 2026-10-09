/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import type { AuthNavigator, AuthScreen } from '../src/navigation';

/**
 * A navigator that records where the screens went, for the harness to render.
 * `location` is what the address bar would show.
 */
export function createFakeNavigator(start: {
  screen: AuthScreen | 'app';
  query?: string;
}) {
  const nav = $state({
    current: start.screen as AuthScreen | 'app',
    path: '/',
    state: {} as Record<string, unknown>,
    query: new URLSearchParams(start.query ?? ''),
  });

  const navigator: AuthNavigator = {
    toScreen: async (screen, state) => {
      nav.current = screen;
      nav.state = state ?? {};
      nav.query = new URLSearchParams();
    },
    toApp: async path => {
      nav.current = 'app';
      nav.path = path ?? '/';
    },
    toLocation: async browserPath => {
      nav.current = 'app';
      nav.path = browserPath;
    },
    state: () => nav.state,
    query: name => nav.query.get(name),
    dropQuery: async () => {
      nav.query = new URLSearchParams();
    },
    absoluteUrl: screen => `http://localhost/auth/${screen}`,
  };

  return { nav, navigator };
}
