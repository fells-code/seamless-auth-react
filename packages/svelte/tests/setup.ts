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
