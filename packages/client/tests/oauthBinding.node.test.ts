/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 *
 * @jest-environment node
 */

import { createAuthSession } from '@/session/createAuthSession';
import { createMemoryStorage } from '@/session/storage';

jest.mock('@/fetchWithAuth', () => ({
  createFetchWithAuth: () => jest.fn(),
  createFetchTransport: () => ({
    fetch: jest.fn(),
    authorizedFetch: jest.fn(),
    mode: 'cookie',
    clearTokens: jest.fn(),
  }),
}));

// React Native has no sessionStorage. Its callback returns to the same process,
// so the in-memory copy is enough. Newer Node versions define a global
// sessionStorage, so it is hidden here to stand in for React Native.
describe('OAuth state binding without sessionStorage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');

  beforeAll(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  });

  it('keeps the binding in memory for the callback, then clears it', async () => {
    expect(typeof sessionStorage).toBe('undefined');

    const client = {
      startOAuthLogin: jest.fn().mockResolvedValue({
        data: {
          provider: { id: 'mock', name: 'Mock' },
          state: 's1',
          authorizationUrl: 'https://idp.example/authorize',
          binding: 'b1',
        },
        error: null,
      }),
      finishOAuthLogin: jest
        .fn()
        .mockResolvedValue({ data: null, error: new Error('x') }),
    };
    const session = createAuthSession({
      apiHost: 'https://api.example.com',
      client: client as never,
      storage: createMemoryStorage(),
    });

    await session.actions.startOAuthLogin({ providerId: 'mock' });
    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });
    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });

    expect(client.finishOAuthLogin).toHaveBeenNthCalledWith(1, {
      providerId: 'mock',
      code: 'c',
      state: 's1',
      binding: 'b1',
    });
    expect(client.finishOAuthLogin).toHaveBeenNthCalledWith(2, {
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });
  });
});
