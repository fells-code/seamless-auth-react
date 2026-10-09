/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

// The fake adapter the binding suites share (test-support/fakeAdapter.ts) is
// written against Jest's mock API, which Vitest's `vi` provides.
(globalThis as unknown as { jest: typeof vi }).jest = vi;

// Node 25 and later define their own localStorage and sessionStorage globals,
// unusable without --localstorage-file, and Vitest does not replace globals the
// runtime already has. Put jsdom's back, which is what a browser would see.
const dom = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom;
if (dom) {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {
      value: dom.window[name],
      configurable: true,
      writable: true,
    });
  }
}
