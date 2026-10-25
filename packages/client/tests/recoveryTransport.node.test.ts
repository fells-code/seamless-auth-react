/**
 * @jest-environment node
 *
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */
import { createMemoryTokenStorage } from '../src/ports/tokenStorage';
import { createTransport, resolveRouteRule } from '../src/transport';

const API = 'https://api.example.com';

type Call = { url: string; init: RequestInit };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function scriptedFetch(script: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return script(call);
  });
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const authorizationOf = (call: Call) =>
  ((call.init.headers ?? {}) as Record<string, string>).Authorization;

describe('recovery route rules', () => {
  // Mirrors the credential the auth API's adapter manifest gives each route.
  it.each([
    ['/recovery-codes', 'access', undefined],
    ['/recovery-codes/redeem', 'preAuth', 'issue'],
    ['/recovery/start', 'preAuth', undefined],
    ['/recovery/verify', 'preAuth', undefined],
    ['/recovery/status', 'preAuth', undefined],
    ['/recovery/complete', 'preAuth', 'issue'],
    ['/recovery/cancel', 'none', undefined],
    ['/recovery/requests', 'access', undefined],
    ['/recovery/requests/8a6e0804-2bd0-4672-b79d-d97027f4071a', 'access', undefined],
  ])('%s takes the %s identity', (path, identity, effect) => {
    const rule = resolveRouteRule(path);
    expect(rule.identity).toBe(identity);
    expect(rule.effect).toBe(effect);
  });
});

describe('bearer transport through recovery', () => {
  it('redeems a code on the pre-auth token and stores the recovery session', async () => {
    const tokenStorage = createMemoryTokenStorage();
    const { calls, fetchImpl } = scriptedFetch(call => {
      if (call.url.endsWith('/login')) {
        return jsonResponse(200, { message: 'Login continued', token: 'ephemeral-1' });
      }
      return jsonResponse(200, {
        message: 'Success',
        token: 'access-recovery',
        refreshToken: 'refresh-1',
        recovery: true,
        nextStep: 'enroll_passkey',
      });
    });
    const transport = createTransport({
      apiHost: API,
      mode: 'bearer',
      fetch: fetchImpl,
      tokenStorage,
    });

    await transport.fetch('/login', { method: 'POST', body: '{}' });
    await transport.fetch('/recovery-codes/redeem', {
      method: 'POST',
      body: JSON.stringify({ code: 'ABCDE-FGHIJ' }),
    });

    expect(authorizationOf(calls[1])).toBe('Bearer ephemeral-1');
    await expect(tokenStorage.get()).resolves.toEqual({
      accessToken: 'access-recovery',
      refreshToken: 'refresh-1',
    });
  });

  it('cancels from a notice link without any token', async () => {
    const tokenStorage = createMemoryTokenStorage();
    await tokenStorage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { calls, fetchImpl } = scriptedFetch(() =>
      jsonResponse(200, { message: 'ok' })
    );
    const transport = createTransport({
      apiHost: API,
      mode: 'bearer',
      fetch: fetchImpl,
      tokenStorage,
    });

    await transport.fetch('/recovery/cancel', {
      method: 'POST',
      body: JSON.stringify({ cancelToken: 't' }),
    });

    expect(authorizationOf(calls[0])).toBeUndefined();
  });

  it('refreshes on request with the refresh token and stores the rotated pair', async () => {
    const tokenStorage = createMemoryTokenStorage();
    await tokenStorage.set({ accessToken: 'access-recovery', refreshToken: 'refresh-1' });
    const { calls, fetchImpl } = scriptedFetch(() =>
      jsonResponse(200, {
        message: 'Success',
        token: 'access-2',
        refreshToken: 'refresh-2',
      })
    );
    const transport = createTransport({
      apiHost: API,
      mode: 'bearer',
      fetch: fetchImpl,
      tokenStorage,
    });

    await expect(transport.refresh()).resolves.toBe(true);

    expect(calls[0].url).toBe(`${API}/auth/refresh`);
    expect(authorizationOf(calls[0])).toBe('Bearer refresh-1');
    await expect(tokenStorage.get()).resolves.toEqual({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
  });
});

describe('cookie transport refresh', () => {
  it('posts to the adapter refresh route with credentials', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({ apiHost: API, fetch: fetchImpl });

    await expect(transport.refresh()).resolves.toBe(true);

    expect(calls[0].url).toBe(`${API}/auth/refresh`);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.credentials).toBe('include');
  });

  it('reports a refused refresh', async () => {
    const { fetchImpl } = scriptedFetch(() =>
      jsonResponse(401, { error: 'unauthorized' })
    );
    const transport = createTransport({ apiHost: API, fetch: fetchImpl });

    await expect(transport.refresh()).resolves.toBe(false);
  });
});
