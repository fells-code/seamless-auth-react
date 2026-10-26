/**
 * @jest-environment node
 *
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
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
  UntrustedOriginError,
  UntrustedRedirectError,
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
    ['/magic-link/verify/abc', 'preAuth', undefined],
    ['/magic-link/verify/abc/confirm', 'none', undefined],
    ['/magic-link', 'preAuth', undefined],
    ['/magic-link/check', 'preAuth', 'issue'],
    ['/otp/generate-login-email-otp', 'preAuth', undefined],
    ['/otp/verify-email-otp', 'preAuth', 'issue'],
    ['/totp/verify-login', 'preAuth', 'issue'],
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

  // An empty apiHost is the same-origin setup (an app serving /auth itself), so
  // the page's own origin is apiHost's origin.
  it('authorizedFetch trusts the page origin when apiHost is empty', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const previous = (globalThis as { location?: unknown }).location;
    (globalThis as { location?: unknown }).location = {
      origin: 'https://app.example.com',
    };

    try {
      const transport = createTransport({ apiHost: '', fetch: fetchImpl });

      await transport.authorizedFetch('https://app.example.com/api/beta-users');
      await expect(
        transport.authorizedFetch('https://other.example.com/x')
      ).rejects.toBeInstanceOf(UntrustedOriginError);

      expect(calls).toHaveLength(1);
      expect(calls[0].init.credentials).toBe('include');
    } finally {
      (globalThis as { location?: unknown }).location = previous;
    }
  });

  it('authorizedFetch with an empty apiHost and no page trusts nothing', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({ apiHost: '', fetch: fetchImpl });

    await expect(
      transport.authorizedFetch('https://app.example.com/api/beta-users')
    ).rejects.toBeInstanceOf(UntrustedOriginError);
    expect(calls).toHaveLength(0);
  });

  it('authorizedFetch sends credentials to apiHost and trusted origins only', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({
      apiHost: API,
      fetch: fetchImpl,
      trustedOrigins: ['https://data.example.com'],
    });

    await transport.authorizedFetch(`${API}/api/plan`, { method: 'GET' });
    await transport.authorizedFetch(new URL('https://data.example.com/x'), {
      method: 'POST',
      body: '{}',
    });

    expect(calls[0].url).toBe(`${API}/api/plan`);
    expect(calls[0].init.credentials).toBe('include');
    expect(headersOf(calls[0])).toEqual({});
    expect(calls[1].url).toBe('https://data.example.com/x');
    expect(calls[1].init.credentials).toBe('include');
    expect(headersOf(calls[1])).toEqual({ 'Content-Type': 'application/json' });
  });

  it('refuses a trustedOrigins entry that is not a bare origin', () => {
    const { fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    for (const entry of [
      '',
      'api.example.com',
      '*.example.com',
      'https://api.example.com/v1',
      'https://api.example.com/?x',
      'https://user@api.example.com',
      'http://api.example.com',
      'ftp://api.example.com',
    ]) {
      expect(() =>
        createTransport({ apiHost: API, fetch: fetchImpl, trustedOrigins: [entry] })
      ).toThrow(/is not an origin/);
    }
    expect(() =>
      createTransport({
        apiHost: API,
        fetch: fetchImpl,
        trustedOrigins: ['https://data.example.com/', 'http://localhost:4000'],
      })
    ).not.toThrow();
  });

  // React Native ships its own URL, which reads the origin with a regex and does
  // not throw on a relative URL. The check has to hold, and stay usable, with it.
  it('judges origins the same way under a React Native style URL', async () => {
    class RegexURL {
      constructor(private readonly url: string) {}
      get href() {
        return this.url;
      }
      get origin() {
        return this.url.match(/^(https?:\/\/[^/]+)/)?.[1] ?? '';
      }
      get protocol() {
        return this.url.match(/^([a-z]+:)/)?.[1] ?? '';
      }
      get hostname() {
        return this.url.match(/^https?:\/\/(?:[^@]+@)?([^:/?#]+)/)?.[1] ?? '';
      }
      get username() {
        return this.url.match(/^https?:\/\/([^:@]+)(?::[^@]*)?@/)?.[1] ?? '';
      }
      get password() {
        return '';
      }
      get pathname() {
        return this.url.match(/https?:\/\/[^/]+(\/[^?#]*)?/)?.[1] ?? '/';
      }
      get search() {
        return this.url.match(/\?[^#]*/)?.[0] ?? '';
      }
      get hash() {
        return this.url.match(/#.*/)?.[0] ?? '';
      }
    }
    const realURL = globalThis.URL;
    globalThis.URL = RegexURL as unknown as typeof URL;
    try {
      const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
      const transport = createTransport({ apiHost: API, fetch: fetchImpl });

      await transport.authorizedFetch(`${API}/beta_users`);
      expect(calls).toHaveLength(1);

      for (const url of [
        'relative/path',
        '',
        `${API}@evil.example.com/x`,
        `${API}.evil.example.com/x`,
        'https://evil.example.com/x',
      ]) {
        await expect(transport.authorizedFetch(url)).rejects.toBeInstanceOf(
          UntrustedOriginError
        );
      }
      expect(calls).toHaveLength(1);
    } finally {
      globalThis.URL = realURL;
    }
  });

  it('authorizedFetch refuses an input that is not a URL', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({ apiHost: API, fetch: fetchImpl });

    await expect(
      transport.authorizedFetch({ url: `${API}/x` } as unknown as string)
    ).rejects.toBeInstanceOf(TypeError);
    expect(calls).toHaveLength(0);
  });

  it('authorizedFetch refuses any other origin without sending a request', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({ apiHost: API, fetch: fetchImpl });

    for (const url of [
      'https://other.example.com/x',
      'https://api.example.com.evil.test/x',
      'http://api.example.com/x',
      'https://api.example.com:8443/x',
      'relative/without/a/page',
      'data:text/plain,hi',
    ]) {
      await expect(transport.authorizedFetch(url)).rejects.toBeInstanceOf(
        UntrustedOriginError
      );
    }
    await expect(
      transport.authorizedFetch('https://other.example.com/x')
    ).rejects.toThrow(/trustedOrigins/);
    expect(calls).toHaveLength(0);
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

  it('verifies a magic link with the ephemeral token only when one is held', async () => {
    const { calls, fetchImpl } = scriptedFetch(call =>
      call.url.endsWith('/login')
        ? jsonResponse(200, { message: 'Login continued', token: 'ephemeral-1' })
        : jsonResponse(200, { message: 'Success' })
    );
    const cold = bearer(fetchImpl, createMemoryTokenStorage());

    const opened = await cold.fetch('/magic-link/verify/tok', { method: 'GET' });
    expect(opened.status).toBe(200);
    expect(headersOf(calls[0])).toEqual({ [AUTH_TRANSPORT_HEADER]: 'bearer' });

    const requester = bearer(fetchImpl, createMemoryTokenStorage());
    await requester.fetch('/login', { method: 'POST', body: '{}' });
    await requester.fetch('/magic-link/verify/tok', { method: 'GET' });
    expect(headersOf(calls[2]).Authorization).toBe('Bearer ephemeral-1');
  });

  it('confirms a magic link without sending any session', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { calls, fetchImpl } = scriptedFetch(call =>
      call.url.endsWith('/login')
        ? jsonResponse(200, { token: 'ephemeral-1' })
        : jsonResponse(200, { message: 'Success' })
    );
    const transport = bearer(fetchImpl, storage);

    await transport.fetch('/login', { method: 'POST', body: '{}' });
    await transport.fetch('/magic-link/verify/tok/confirm', { method: 'POST' });

    expect(headersOf(calls[1]).Authorization).toBeUndefined();
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

  it.each([
    ['/totp/enroll/verify', 'totp_verification_failed'],
    ['/totp/verify-mfa', 'totp_verification_failed'],
    ['/totp/disable', 'totp_disable_failed'],
    ['/step-up/webauthn/finish', 'step_up_failed'],
  ])('does not resend a rejected code to %s', async (path, error) => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access', refreshToken: 'refresh' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(401, { error }));

    const response = await bearer(fetchImpl, storage).fetch(path, {
      method: 'POST',
      body: JSON.stringify({ code: '123456' }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error });
    expect(calls).toHaveLength(1);
    expect(await storage.get()).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('still refreshes a 401 whose body is not JSON', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-old', refreshToken: 'refresh-old' });
    const { calls, fetchImpl } = scriptedFetch(call => {
      if (call.url.endsWith('/refresh')) {
        return jsonResponse(200, { token: 'access-new', refreshToken: 'refresh-new' });
      }
      return headersOf(call).Authorization === 'Bearer access-new'
        ? jsonResponse(200, {})
        : new Response('Unauthorized', { status: 401 });
    });

    const response = await bearer(fetchImpl, storage).fetch('/users/me', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(calls.filter(c => c.url.endsWith('/refresh'))).toHaveLength(1);
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

  it('authorizedFetch carries the access token to apiHost without the transport header', async () => {
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

  it('authorizedFetch treats a URL under the adapter mount as an adapter call', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, { sessions: [] }));

    const response = await bearer(fetchImpl, storage).authorizedFetch(
      `${API}/auth/sessions`,
      {
        method: 'GET',
      }
    );

    expect(response.status).toBe(200);
    expect(calls[0].url).toBe(`${API}/auth/sessions`);
    expect(headersOf(calls[0])).toEqual({
      Authorization: 'Bearer access-1',
      [AUTH_TRANSPORT_HEADER]: 'bearer',
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

  it('authorizedFetch never sends the access token to an untrusted origin', async () => {
    const storage = createMemoryTokenStorage();
    await storage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(401, {}));

    await expect(
      bearer(fetchImpl, storage).authorizedFetch('https://other.example.com/api')
    ).rejects.toBeInstanceOf(UntrustedOriginError);
    // Not sent, and no refresh attempted on its behalf either.
    expect(calls).toHaveLength(0);
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

describe('bearer transport redirects', () => {
  const signedIn = async (fetchImpl: typeof fetch) => {
    const tokenStorage = createMemoryTokenStorage();
    await tokenStorage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    return createTransport({
      apiHost: API,
      mode: 'bearer',
      fetch: fetchImpl,
      tokenStorage,
    });
  };

  const redirect = (status: number, location: string) =>
    new Response(null, { status, headers: { location } });

  const with_ = (
    response: Response,
    props: Partial<Record<'redirected' | 'url' | 'type', unknown>>
  ) => {
    for (const [key, value] of Object.entries(props)) {
      Object.defineProperty(response, key, { value });
    }
    return response;
  };

  it('does not follow a redirect to another origin with the token', async () => {
    const { calls, fetchImpl } = scriptedFetch(() =>
      redirect(302, 'https://elsewhere.example.com/steal')
    );
    const transport = await signedIn(fetchImpl);

    await expect(transport.authorizedFetch(`${API}/api/plan`)).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].init.redirect).toBe('manual');
    expect(calls.some(call => call.url.startsWith('https://elsewhere.example.com'))).toBe(
      false
    );
  });

  it('follows a redirect that stays on a trusted origin, keeping the token', async () => {
    const { calls, fetchImpl } = scriptedFetch((_call, index) =>
      index === 0 ? redirect(307, '/api/plan/') : jsonResponse(200, { ok: true })
    );
    const transport = await signedIn(fetchImpl);

    const response = await transport.authorizedFetch(`${API}/api/plan`);

    expect(response.status).toBe(200);
    expect(calls.map(call => call.url)).toEqual([`${API}/api/plan`, `${API}/api/plan/`]);
    expect(headersOf(calls[1]).Authorization).toBe('Bearer access-1');
  });

  it('turns a POST into a GET without a body on 303, as fetch would', async () => {
    const { calls, fetchImpl } = scriptedFetch((_call, index) =>
      index === 0 ? redirect(303, `${API}/api/done`) : jsonResponse(200, {})
    );
    const transport = await signedIn(fetchImpl);

    await transport.authorizedFetch(`${API}/api/submit`, { method: 'POST', body: '{}' });

    expect(calls[1].init.method).toBe('GET');
    expect(calls[1].init.body).toBeUndefined();
  });

  it('stops after five redirects', async () => {
    const { calls, fetchImpl } = scriptedFetch((_call, index) =>
      redirect(302, `${API}/loop/${index + 1}`)
    );
    const transport = await signedIn(fetchImpl);

    await expect(transport.authorizedFetch(`${API}/loop/0`)).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );
    expect(calls).toHaveLength(5);
  });

  // React Native's fetch ignores redirect: 'manual' and follows on its own. The
  // token may already have gone, but the response is not handed back as if it
  // came from the API.
  it('refuses a response a platform followed to another origin', async () => {
    const { fetchImpl } = scriptedFetch(() =>
      with_(jsonResponse(200, { secret: true }), {
        redirected: true,
        url: 'https://elsewhere.example.com/landing',
      })
    );
    const transport = await signedIn(fetchImpl);

    await expect(transport.authorizedFetch(`${API}/api/plan`)).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );
  });

  // whatwg-fetch, React Native's fetch, sets `url` from the XHR but never
  // `redirected`.
  it('refuses a followed response on another origin when redirected is not set', async () => {
    const { fetchImpl } = scriptedFetch(() =>
      with_(jsonResponse(200, { secret: true }), {
        redirected: undefined,
        url: 'https://elsewhere.example.com/landing',
      })
    );
    const transport = await signedIn(fetchImpl);

    await expect(transport.authorizedFetch(`${API}/api/plan`)).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );
    await expect(transport.fetch('/users/me')).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );
  });

  it('accepts a followed response that stayed on a trusted origin', async () => {
    const { fetchImpl } = scriptedFetch(() =>
      with_(jsonResponse(200, { ok: true }), {
        redirected: undefined,
        url: `${API}/api/plan/`,
      })
    );
    const transport = await signedIn(fetchImpl);

    const response = await transport.authorizedFetch(`${API}/api/plan`);
    expect(response.status).toBe(200);
  });

  it('does not follow a redirect a browser hides', async () => {
    const { fetchImpl } = scriptedFetch(() =>
      with_(new Response(null, { status: 200 }), { type: 'opaqueredirect' })
    );
    const transport = await signedIn(fetchImpl);

    await expect(transport.authorizedFetch(`${API}/api/plan`)).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );
  });

  it("leaves the caller's own redirect choice alone, but still checks where it ended", async () => {
    const { calls, fetchImpl } = scriptedFetch(() =>
      with_(jsonResponse(200, {}), { redirected: true, url: `${API}/api/moved` })
    );
    const transport = await signedIn(fetchImpl);

    const response = await transport.authorizedFetch(`${API}/api/plan`, {
      redirect: 'follow',
    });

    expect(response.status).toBe(200);
    expect(calls[0].init.redirect).toBe('follow');
  });

  const expiredThen = (refresh: (call: Call) => Response) =>
    scriptedFetch(call =>
      call.url.endsWith('/auth/refresh')
        ? refresh(call)
        : jsonResponse(401, { error: 'expired' })
    );

  it('sends the refresh with redirect manual and refuses a 3xx', async () => {
    const { calls, fetchImpl } = expiredThen(() =>
      redirect(307, 'https://elsewhere.example.com/refresh')
    );
    const tokenStorage = createMemoryTokenStorage();
    await tokenStorage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const transport = createTransport({
      apiHost: API,
      mode: 'bearer',
      fetch: fetchImpl,
      tokenStorage,
    });

    await expect(transport.fetch('/users/me')).rejects.toEqual(
      new UntrustedRedirectError('https://elsewhere.example.com/refresh')
    );

    const refreshes = calls.filter(call => call.url.endsWith('/refresh'));
    expect(refreshes).toHaveLength(1);
    expect(refreshes[0].init.redirect).toBe('manual');
    expect(calls.some(call => call.url.startsWith('https://elsewhere'))).toBe(false);
    await expect(tokenStorage.get()).resolves.toBeNull();
  });

  it('refuses a refresh redirect even to a trusted origin', async () => {
    const { calls, fetchImpl } = expiredThen(() => redirect(302, `${API}/auth/refresh2`));
    const transport = await signedIn(fetchImpl);

    await expect(transport.fetch('/users/me')).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );
    expect(calls.filter(call => call.url.endsWith('/refresh2'))).toHaveLength(0);
  });

  it('refuses a refresh redirect a browser hides', async () => {
    const { fetchImpl } = expiredThen(() =>
      with_(new Response(null, { status: 200 }), { type: 'opaqueredirect' })
    );
    const transport = await signedIn(fetchImpl);

    await expect(transport.fetch('/users/me')).rejects.toEqual(
      new UntrustedRedirectError(`${API}/auth/refresh`)
    );
  });

  it('refuses a refresh that a platform followed to another origin', async () => {
    const { fetchImpl } = expiredThen(() =>
      with_(jsonResponse(200, { token: 'stolen', refreshToken: 'stolen' }), {
        url: 'https://elsewhere.example.com/refresh',
      })
    );
    const tokenStorage = createMemoryTokenStorage();
    await tokenStorage.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const transport = createTransport({
      apiHost: API,
      mode: 'bearer',
      fetch: fetchImpl,
      tokenStorage,
    });

    await expect(transport.fetch('/users/me')).rejects.toBeInstanceOf(
      UntrustedRedirectError
    );
    await expect(tokenStorage.get()).resolves.toBeNull();
  });

  it('does not change a request that carries no token', async () => {
    const { calls, fetchImpl } = scriptedFetch(() => jsonResponse(200, {}));
    const transport = createTransport({ apiHost: API, mode: 'bearer', fetch: fetchImpl });

    await transport.fetch('/system-config/public', { method: 'GET' });

    expect(calls[0].init.redirect).toBeUndefined();
  });
});
