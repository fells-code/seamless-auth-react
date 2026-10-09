/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // Tests run against the client source, so a change in the core is exercised
    // here without a build in between.
    alias: {
      '@seamless-auth/client': path.resolve(here, '../client/src/index.ts'),
      '$app/navigation': path.resolve(here, 'tests/kitStubs.ts'),
      '$app/state': path.resolve(here, 'tests/kitStubs.ts'),
      '$app/paths': path.resolve(here, 'tests/kitStubs.ts'),
      '$app/environment': path.resolve(here, 'tests/kitStubs.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Testing Library ships rune modules, which only the Svelte plugin compiles.
    server: { deps: { inline: [/@testing-library\/svelte/] } },
    coverage: { include: ['src/**'], reporter: ['text', 'lcov'] },
  },
});
