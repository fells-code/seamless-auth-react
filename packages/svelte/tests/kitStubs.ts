/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { vi } from 'vitest';

// Stand-ins for SvelteKit's $app modules, which exist only inside a Kit app.
// The tests drive `page` and assert what the navigator asked for.

export const page = {
  url: new URL('http://localhost/login'),
  state: {} as Record<string, unknown>,
};

export const goto = vi.fn(
  async (url: string, options?: { state?: Record<string, unknown> }) => {
    page.url = new URL(url, 'http://localhost');
    page.state = options?.state ?? {};
  }
);

export const replaceState = vi.fn(async (url: string, state: Record<string, unknown>) => {
  page.url = new URL(url, 'http://localhost');
  page.state = state;
});

export const resolve = vi.fn((path: string) => (path === '/' ? '/app' : `/app${path}`));
