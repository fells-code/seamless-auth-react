/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

/**
 * A stand-in for the server adapter: answers `/auth/*` by method and path, and
 * records every request so tests can assert what the browser sent.
 */
export interface AdapterReply {
  status?: number;
  body?: unknown;
}

export type AdapterHandler = (init: RequestInit) => AdapterReply | undefined;

export interface AdapterCall {
  method: string;
  path: string;
  init: RequestInit;
}

// The jsdom environment has no fetch globals, and the client only reads these.
function fakeResponse(status: number, body: unknown): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(
      body === undefined ? {} : { 'content-type': 'application/json' }
    ),
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return JSON.parse(JSON.stringify(body));
    },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    clone: () => fakeResponse(status, body),
  };
  return response as unknown as Response;
}

export function createAdapter(
  routes: Record<string, AdapterReply | AdapterHandler> = {}
) {
  const calls: AdapterCall[] = [];

  const fetch = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/auth/, '');
    calls.push({ method, path, init });

    const route = routes[`${method} ${path}`];
    const reply: AdapterReply = (typeof route === 'function' ? route(init) : route) ?? {
      status: 404,
      body: {},
    };
    const status = reply.status ?? 200;

    return fakeResponse(status, status === 204 ? undefined : (reply.body ?? {}));
  });

  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    calls,
    called: (method: string, path: string) =>
      calls.filter(call => call.method === method && call.path === path),
    routes,
  };
}

export const user = {
  id: 'user-1',
  email: 'ada@example.com',
  phone: '',
  roles: ['user', 'org:admin'],
};

export const signedIn: AdapterReply = {
  body: { user, credentials: [], organizations: [], activeOrganization: null },
};

export const signedOut: AdapterReply = {
  status: 401,
  body: { error: 'unauthenticated' },
};

/** A magic link opened on a device other than the one that asked for it. */
export const confirmationRequired: AdapterReply = {
  status: 409,
  body: {
    error: 'confirmation_required',
    message: 'Confirm this sign-in.',
    requestedFrom: { deviceClass: 'android', requestedAt: '2026-10-16T14:05:00.000Z' },
  },
};

export const flush = () => new Promise(resolve => setTimeout(resolve, 0));

export const passkeyPort = (supported: boolean) => ({
  isSupported: () => supported,
  isPlatformAuthenticatorAvailable: async () => supported,
  create: jest.fn(),
  get: jest.fn(),
});
