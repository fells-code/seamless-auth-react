/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { vi } from 'vitest';

// Stand-ins for SvelteKit's $app modules, which exist only inside a Kit app.
// They behave the way Kit does where the binding depends on it: goto updates
// page.url and page.state; shallow replaceState would not, which is why the
// navigator must not use it.

export const page = {
  url: new URL('http://localhost/app/login'),
  state: {} as Record<string, unknown>,
};

export const goto = vi.fn(
  async (
    url: string,
    options?: { state?: Record<string, unknown>; replaceState?: boolean }
  ) => {
    page.url = new URL(url, 'http://localhost');
    page.state = options?.state ?? {};
  }
);

export const replaceState = vi.fn();

export const invalidate = vi.fn(async () => undefined);

// Kit registers these through onMount, so outside a component they throw. The
// tests hold on to the callback to play the end of hydration.
export const afterNavigateCallbacks: Array<() => void> = [];
export const afterNavigate = vi.fn((callback: () => void) => {
  afterNavigateCallbacks.push(callback);
});

export const resolve = vi.fn((path: string) => (path === '/' ? '/app' : `/app${path}`));
