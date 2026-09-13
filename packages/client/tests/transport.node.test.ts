/**
 * @jest-environment node
 *
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 *
 * Node rather than jsdom: the transport builds and reads real `Response`
 * objects, which the jsdom environment does not provide.
 */
import {
  createMemoryTokenStorage,
  type TokenStoragePort,
} from '../src/ports/tokenStorage';
import {
  AUTH_TRANSPORT_HEADER,
  createTransport,
  resolveRouteRule,
} from '../src/transport';

const API = 'https://api.example.com';

type Call = { url: string; init: RequestInit };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A fetch that answers from a script and records what it was asked. */
function scriptedFetch(
  script: (call: Call, index: number) => Response | Promise<Response>
) {
  const calls: Call[] = [];
  const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return script(call, calls.length - 1);
  });
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

function headersOf(call: Call): Record<string, string> {
  return (call.init.headers ?? {}) as Record<string, string>;
}

describe('resolveRouteRule', () => {
  it.each([
    ['/login', 'none', 'ephemeral'],
    ['/registration/register', 'none', 'ephemeral'],
    ['/oauth/providers', 'none', undefined],
    ['/oauth/google/start', 'none', undefined],
    ['/oauth/google/callback', 'none', 'issue'],
    ['/system-config/public', 'none', undefined],
    ['/magic-link/verify/abc', 'none', undefined],
    ['/magic-link', 'preAuth', undefined],
    ['/magic-link/check', 'preAuth', 'issue'],
    ['/otp/generate-login-email-otp', 'preAuth', undefined],
    ['/otp/verify-email-otp', 'preAuth', 'issue'],
    ['/webAuthn/login/start', 'preAuth', undefined],
    ['/webAuthn/login/finish', 'preAuth', 'issue'],
    ['/refresh', 'none', 'issue'],
    ['/logout', 'access', 'end'],
    ['/logout/all', 'access', 'end'],
    ['/users/delete', 'access', 'end'],
    ['/organizations/org-1/switch', 'access', 'issue'],
    ['/users/me', 'access', undefined],
    ['/webAuthn/register/start', 'access', undefined],
    ['/step-up/status', 'access', undefined],
    ['/organizations', 'access', undefined],
  ])('%s takes the %s identity', (path, identity, effect) => {
    const rule = resolveRouteRule(path);
    expect(rule.identity).toBe(identity);
    expect(rule.effect).toBe(effect);
  });
});

describe('cookie transport', () => {
  it('sends credentials to the /auth mount and nothing else', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({ apiHost: `${API}/`, fetch: fetchImpl });

    await transport.fetch('users/me', { method: 'GET' });
    await transport.fetch('/login', { method: 'POST', body: '{}' });

    expect(calls[0].url).toBe(`${API}/auth/users/me`);
    expect(calls[0].init.credentials).toBe('include');
    expect(headersOf(calls[0])).toEqual({});

    expect(calls[1].url).toBe(`${API}/auth/login`);
    expect(headersOf(calls[1])).toEqual({ 'Content-Type': 'application/json' });
    expect(transport.mode).toBe('cookie');
  });

  it('authorizedFetch sends credentials to any URL untouched', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({ apiHost: API, fetch: fetchImpl });

    await transport.authorizedFetch(`${API}/api/plan`, { method: 'GET' });
    await transport.authorizedFetch(new URL('https://other.example.com/x'), {
      method: 'POST',
      body: '{}',
    });

    expect(calls[0].url).toBe(`${API}/api/plan`);
    expect(calls[0].init.credentials).toBe('include');
    expect(headersOf(calls[0])).toEqual({});
    expect(calls[1].url).toBe('https://other.example.com/x');
    expect(headersOf(calls[1])).toEqual({ 'Content-Type': 'application/json' });
  });

  it('never touches token storage', async () => {
    const storage: TokenStoragePort = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => undefined),
      remove: jest.fn(async () => undefined),
    };
    const { fetchImpl } = scriptedFetch(() =>
      jsonResponse(200, { token: 'a', refreshToken: 'r' })
    );
    const transport = createTransport({
      apiHost: API,
      fetch: fetchImpl,
      tokenStorage: storage,
    });

    await transport.fetch('/otp/verify-login-email-otp', { method: 'POST', body: '{}' });
    await transport.clearTokens();

    expect(storage.get).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});

describe('bearer transport', () => {
  const bearer = (fetchImpl: typeof fetch, tokenStorage = createMemoryTokenStorage()) =>
    createTransport({ apiHost: API, mode: 'bearer', fetch: fetchImpl, tokenStorage });

  it('marks every request with the transport header and omits credentials', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));

    await bearer(fetchImpl).fetch('/system-config/public', { method: 'GET' });

    expect(calls[0].init.credentials).toBeUndefined();
    expect(headersOf(calls[0])).toEqual({ [AUTH_TRANSPORT_HEADER]: 'bearer' });
  });

  it('honours a custom mount path', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({
      apiHost: API,
      mode: 'bearer',
      basePath: 'identity/',
      fetch: fetchImpl,
    });

    await transport.fetch('/login', { method: 'POST', body: '{}' });

    expect(calls[0].url).toBe(`${API}/identity/login`);
  });

  it('carries a sign-in from /login through a pre-auth step into a stored session', async () => {
    const storage = createMemoryTokenStorage();
    const { calls, fetchImpl } = scriptedFetch(call => {
      if (call.url.endsWith('/login')) {
        return jsonResponse(200, {
          message: 'Login continued',
          token: 'ephemeral-1',
          sub: 'u',
        });
      }
      if (call.url.endsWith('/otp/generate-login-email-otp')) {
        return jsonResponse(200, { message: 'sent' });
      }
      if (call.url.endsWith('/otp/verify-login-email-otp')) {
        return jsonResponse(200, {
          message: 'Success',
          token: 'access-1',
          refreshToken: 'refresh-1',
        });
      }
      return jsonResponse(200, { user: { id: 'u' } });
    });
    const transport = bearer(fetchImpl, storage);

    const started = await transport.fetch('/login', { method: 'POST', body: '{}' });
    // The caller can still read the body the transport peeked at.
    expect(await started.json()).toMatchObject({ token: 'ephemeral-1' });
    expect(headersOf(calls[0]).Authorization).toBeUndefined();

    await transport.fetch('/otp/generate-login-email-otp', {
      method: 'POST',
      body: '{}',
    });
    expect(headersOf(calls[1]).Authorization).toBe('Bearer ephemeral-1');

    const verified = await transport.fetch('/otp/verify-login-email-otp', {
      method: 'POST',
      body: '{}',
    });
    expect(await verified.json()).toMatchObject({ token: 'access-1' });
    expect(await storage.get()).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });

    await transport.fetch('/users/me', { method: 'GET' });
    expect(headersOf(calls[3]).Authorization).toBe('Bearer access-1');

    // The ephemeral token is spent once a session exists.
    await transport.fetch('/otp/generate-login-email-otp', {
      method: 'POST',
      body: '{}',
    });
    expect(headersOf(calls[4]).Authorization).toBeUndefined();
  });

  it('holds nothing when a pre-auth step returns no session yet', async () => {
    const storage = createMemoryTokenStorage();
    const { fetchImpl } = scriptedFetch(() =>
      jsonResponse(200, { message: 'phone verified' })
    );

    await bearer(fetchImpl, storage).fetch('/otp/verify-phone-otp', {
      method: 'POST',
      body: '{}',
    });

    expect(await storage.get()).toBeNull();
  });

  it('never persists the ephemeral token', async () => {
    const storage = createMemoryTokenStorage();
    const { fetchImpl } = scriptedFetch(() =>
      jsonResponse(200, { token: 'ephemeral-1', sub: 'u', ttl: 300 })
    );

    await bearer(fetchImpl, storage).fetch('/registration/register', {
      method: 'POST',
      body: '{}',
    });

    expect(await storage.get()).toBeNull();
  });

  it('attaches a session restored from storage on the first request', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-cold', refreshToken: 'refresh-cold' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, { user: {} }));

    await bearer(fetchImpl, storage).fetch('/users/me', { method: 'GET' });

    expect(headersOf(calls[0]).Authorization).toBe('Bearer access-cold');
  });

  it('refreshes once on a 401 and retries the request with the new token', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-old', refreshToken: 'refresh-old' });
    const { calls, fetchImpl } = scriptedFetch(call => {
      if (call.url.endsWith('/refresh')) {
        return jsonResponse(200, { token: 'access-new', refreshToken: 'refresh-new' });
      }
      return headersOf(call).Authorization === 'Bearer access-new'
        ? jsonResponse(200, { user: { id: 'u' } })
        : jsonResponse(401, { error: 'unauthenticated' });
    });

    const response = await bearer(fetchImpl, storage).fetch('/users/me', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(calls.map(c => c.url.replace(`${API}/auth`, ''))).toEqual([
      '/users/me',
      '/refresh',
      '/users/me',
    ]);
    expect(headersOf(calls[1])).toMatchObject({
      Authorization: 'Bearer refresh-old',
      [AUTH_TRANSPORT_HEADER]: 'bearer',
    });
    expect(calls[1].init.method).toBe('POST');
    expect(await storage.get()).toEqual({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
    });
  });

  it('collapses concurrent 401s into a single refresh', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-old', refreshToken: 'refresh-old' });

    let releaseRefresh: () => void = () => undefined;
    const refreshGate = new Promise<void>(resolve => {
      releaseRefresh = resolve;
    });

    const { calls, fetchImpl } = scriptedFetch(async call => {
      if (call.url.endsWith('/refresh')) {
        await refreshGate;
        return jsonResponse(200, { token: 'access-new', refreshToken: 'refresh-new' });
      }
      return headersOf(call).Authorization === 'Bearer access-new'
        ? jsonResponse(200, {})
        : jsonResponse(401, {});
    });
    const transport = bearer(fetchImpl, storage);

    const first = transport.fetch('/users/me', { method: 'GET' });
    const second = transport.fetch('/organizations', { method: 'GET' });
    // Both 401s have landed and both are parked on the one refresh.
    await new Promise(resolve => setTimeout(resolve, 0));
    releaseRefresh();

    const [a, b] = await Promise.all([first, second]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(calls.filter(c => c.url.endsWith('/refresh'))).toHaveLength(1);
  });

  it('clears the session and returns the 401 when the refresh is refused', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-old', refreshToken: 'refresh-spent' });
    const { calls, fetchImpl } = scriptedFetch(call =>
      call.url.endsWith('/refresh')
        ? jsonResponse(401, { error: 'refresh_token_reused' })
        : jsonResponse(401, { error: 'unauthenticated' })
    );

    const response = await bearer(fetchImpl, storage).fetch('/users/me', {
      method: 'GET',
    });

    expect(response.status).toBe(401);
    expect(await storage.get()).toBeNull();
    // No retry without a session to retry with.
    expect(calls).toHaveLength(2);
  });

  it('does not refresh a 401 on a pre-auth or public route', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access', refreshToken: 'refresh' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(401, {}));
    const transport = bearer(fetchImpl, storage);

    await transport.fetch('/otp/verify-login-email-otp', { method: 'POST', body: '{}' });
    await transport.fetch('/login', { method: 'POST', body: '{}' });

    expect(calls.filter(c => c.url.endsWith('/refresh'))).toHaveLength(0);
  });

  it('does not refresh a 401 when there is no session to refresh', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(401, {}));

    await bearer(fetchImpl).fetch('/users/me', { method: 'GET' });

    expect(calls).toHaveLength(1);
  });

  it('forgets the session when the user signs out', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access', refreshToken: 'refresh' });
    const { calls, fetchImpl } = scriptedFetch(() => new Response(null, { status: 204 }));

    await bearer(fetchImpl, storage).fetch('/logout', { method: 'DELETE' });

    expect(headersOf(calls[0]).Authorization).toBe('Bearer access');
    expect(await storage.get()).toBeNull();
  });

  it('keeps the session when sign-out fails upstream', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access', refreshToken: 'refresh' });
    const { fetchImpl } = scriptedFetch(() =>
      jsonResponse(503, { error: 'unavailable' })
    );

    await bearer(fetchImpl, storage).fetch('/logout', { method: 'DELETE' });

    expect(await storage.get()).not.toBeNull();
  });

  it('keeps the refresh token when a rotation reissues only the access token', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { fetchImpl } = scriptedFetch(() =>
      jsonResponse(200, { token: 'access-org', sub: 'u', organizationId: 'org-1' })
    );

    await bearer(fetchImpl, storage).fetch('/organizations/org-1/switch', {
      method: 'POST',
    });

    expect(await storage.get()).toEqual({
      accessToken: 'access-org',
      refreshToken: 'refresh-1',
    });
  });

  it('clearTokens drops the held session without a network call', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access', refreshToken: 'refresh' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = bearer(fetchImpl, storage);

    await transport.clearTokens();
    await transport.fetch('/users/me', { method: 'GET' });

    expect(await storage.get()).toBeNull();
    expect(headersOf(calls[0]).Authorization).toBeUndefined();
  });

  it('authorizedFetch carries the access token to any URL without the transport header', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, { plan: [] }));

    const response = await bearer(fetchImpl, storage).authorizedFetch(`${API}/api/plan`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(calls[0].url).toBe(`${API}/api/plan`);
    expect(calls[0].init.credentials).toBeUndefined();
    expect(headersOf(calls[0])).toEqual({ Authorization: 'Bearer access-1' });
  });

  it('authorizedFetch flattens Headers instances and entry arrays into plain headers', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = bearer(fetchImpl, storage);

    const asInstance = new Headers();
    asInstance.set('Content-Type', 'application/json');
    await transport.authorizedFetch(`${API}/api/plan`, {
      method: 'POST',
      body: '{}',
      headers: asInstance,
    });
    await transport.authorizedFetch(`${API}/api/plan`, {
      headers: [['X-Trace', 'abc']],
    });

    // Spreading a Headers instance would have produced an object with no
    // usable keys (or a nested `map` on React Native) and lost the header.
    expect(headersOf(calls[0])).toEqual({
      Authorization: 'Bearer access-1',
      'content-type': 'application/json',
    });
    expect(headersOf(calls[1])).toEqual({
      Authorization: 'Bearer access-1',
      'X-Trace': 'abc',
    });
  });

  it('authorizedFetch refreshes once on a 401 and retries', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-old', refreshToken: 'refresh-old' });
    const { calls, fetchImpl } = scriptedFetch(call => {
      if (call.url.endsWith('/auth/refresh')) {
        return jsonResponse(200, { token: 'access-new', refreshToken: 'refresh-new' });
      }
      return headersOf(call).Authorization === 'Bearer access-new'
        ? jsonResponse(200, { ok: true })
        : jsonResponse(401, { message: 'Unauthorized' });
    });

    const response = await bearer(fetchImpl, storage).authorizedFetch(`${API}/api/plan`);

    expect(response.status).toBe(200);
    expect(calls.map(c => c.url)).toEqual([
      `${API}/api/plan`,
      `${API}/auth/refresh`,
      `${API}/api/plan`,
    ]);
    expect(await storage.get()).toEqual({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
    });
  });

  it('authorizedFetch never captures tokens from an application response', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { fetchImpl } = scriptedFetch(() =>
      jsonResponse(200, { token: 'not-ours', refreshToken: 'not-ours-either' })
    );

    await bearer(fetchImpl, storage).authorizedFetch(`${API}/api/thing`);

    expect(await storage.get()).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
  });

  it('tolerates a non-JSON success body on a session route', async () => {
    const storage = createMemoryTokenStorage();
    const { fetchImpl } = scriptedFetch(() => new Response('ok', { status: 200 }));

    await expect(
      bearer(fetchImpl, storage).fetch('/magic-link/check', { method: 'GET' })
    ).resolves.toBeInstanceOf(Response);
    expect(await storage.get()).toBeNull();
  });
});
