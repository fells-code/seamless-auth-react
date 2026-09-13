/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createMemoryTokenStorage,
  type StoredTokens,
  type TokenStoragePort,
} from './ports/tokenStorage';

/**
 * How the client carries its session to the server adapter.
 *
 * `cookie` is the browser contract: the adapter holds the tokens in `httpOnly`
 * cookies and this client never sees them. `bearer` is the native contract:
 * this client holds the auth API's own tokens, presents the one a route needs
 * in `Authorization`, and stores the ones a response issues. The adapter
 * serves both on the same routes; the header below selects the second.
 */
export type AuthTransportMode = 'cookie' | 'bearer';

export const AUTH_TRANSPORT_HEADER = 'x-seamless-auth-transport';

export interface TransportOptions {
  apiHost: string;
  /** Where the server adapter is mounted. Defaults to `/auth`. */
  basePath?: string;
  mode?: AuthTransportMode;
  /** Required for bearer transport. Defaults to memory, which does not survive a restart. */
  tokenStorage?: TokenStoragePort;
  /** The fetch to use. Defaults to the global one. */
  fetch?: typeof fetch;
}

export type FetchWithAuth = (input: string, init?: RequestInit) => Promise<Response>;

export interface Transport {
  /** A request to the server adapter's auth routes, by path under the mount. */
  fetch: FetchWithAuth;
  /**
   * A request to any URL, carrying the session the way this transport does:
   * cookies in cookie transport, the access token (refreshed once on a 401) in
   * bearer transport. For an application's own API behind `requireAuth`.
   */
  authorizedFetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
  mode: AuthTransportMode;
  /** Forgets the held session without calling the server. Bearer transport only; a no-op otherwise. */
  clearTokens(): Promise<void>;
}

/**
 * Which token a route needs. `none` is a public route, `preAuth` continues a
 * sign-in with the ephemeral token `/login` or `/registration/register`
 * returned, and `access` is a signed-in route.
 */
type RequestIdentity = 'none' | 'preAuth' | 'access';

/**
 * What a successful response does to the held session. `ephemeral` starts a
 * flow, `issue` signs in (or rotates) and `end` signs out.
 */
type SessionEffect = 'ephemeral' | 'issue' | 'end';

interface RouteRule {
  match: RegExp;
  identity: RequestIdentity;
  effect?: SessionEffect;
}

/**
 * The same map the server adapter keeps of which routes take which session.
 * Kept here, in one place, rather than annotated at every call site in the
 * client: a route that moves between identities upstream is a one-line change
 * that cannot be missed at one of forty call sites.
 */
const ROUTE_RULES: readonly RouteRule[] = [
  { match: /^\/login$/, identity: 'none', effect: 'ephemeral' },
  { match: /^\/registration\/register$/, identity: 'none', effect: 'ephemeral' },
  { match: /^\/oauth\/providers$/, identity: 'none' },
  { match: /^\/oauth\/[^/]+\/start$/, identity: 'none' },
  { match: /^\/oauth\/[^/]+\/callback$/, identity: 'none', effect: 'issue' },
  { match: /^\/system-config\/public$/, identity: 'none' },
  { match: /^\/magic-link\/verify\/[^/]+$/, identity: 'none' },
  { match: /^\/magic-link$/, identity: 'preAuth' },
  { match: /^\/magic-link\/check$/, identity: 'preAuth', effect: 'issue' },
  { match: /^\/otp\/generate-/, identity: 'preAuth' },
  { match: /^\/otp\/verify-/, identity: 'preAuth', effect: 'issue' },
  { match: /^\/webAuthn\/login\/start$/, identity: 'preAuth' },
  { match: /^\/webAuthn\/login\/finish$/, identity: 'preAuth', effect: 'issue' },
  { match: /^\/refresh$/, identity: 'none', effect: 'issue' },
  { match: /^\/logout(\/all)?$/, identity: 'access', effect: 'end' },
  { match: /^\/users\/delete$/, identity: 'access', effect: 'end' },
  { match: /^\/organizations\/[^/]+\/switch$/, identity: 'access', effect: 'issue' },
];

const DEFAULT_RULE: RouteRule = { match: /.*/, identity: 'access' };

export function resolveRouteRule(path: string): RouteRule {
  return ROUTE_RULES.find(rule => rule.match.test(path)) ?? DEFAULT_RULE;
}

function normalizePath(input: string): string {
  return input.startsWith('/') ? input : `/${input}`;
}

function buildUrl(apiHost: string, basePath: string, path: string): string {
  const host = apiHost.replace(/\/+$/, '');
  const mount = basePath === '' ? '' : `/${basePath.replace(/^\/+|\/+$/g, '')}`;
  return `${host}${mount}${path}`;
}

function withHeaders(
  init: RequestInit | undefined,
  extra: Record<string, string>
): RequestInit {
  // Only declare a JSON content type when a body is actually sent. Some
  // proxies reject a bodyless GET that advertises a request content type.
  const hasBody = init?.body != null;

  return {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...extra,
      ...init?.headers,
    },
  };
}

interface SessionBody {
  token?: unknown;
  refreshToken?: unknown;
}

async function readSessionBody(response: Response): Promise<SessionBody | null> {
  try {
    // Cloned so the caller can still read the body it was handed.
    const data: unknown = await response.clone().json();
    return data && typeof data === 'object' ? (data as SessionBody) : null;
  } catch {
    return null;
  }
}

export function createTransport(options: TransportOptions): Transport {
  const mode = options.mode ?? 'cookie';
  const basePath = options.basePath ?? '/auth';
  const fetchImpl =
    options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  if (mode === 'cookie') {
    return {
      mode,
      fetch: (input, init) =>
        fetchImpl(
          buildUrl(options.apiHost, basePath, normalizePath(input)),
          withHeaders({ ...init, credentials: 'include' }, {})
        ),
      authorizedFetch: (input, init) =>
        fetchImpl(String(input), withHeaders({ ...init, credentials: 'include' }, {})),
      clearTokens: async () => undefined,
    };
  }

  const storage = options.tokenStorage ?? createMemoryTokenStorage();

  // The ephemeral token lives only here: it belongs to the sign-in in flight
  // and nothing else, so it is never written to the keystore.
  let ephemeralToken: string | undefined;

  // Read-through cache over the keystore, so a request does not pay for a
  // keystore read and the pair is consistent within the process.
  let cached: StoredTokens | null | undefined;

  async function readTokens(): Promise<StoredTokens | null> {
    if (cached === undefined) {
      cached = await storage.get();
    }
    return cached;
  }

  async function writeTokens(tokens: StoredTokens): Promise<void> {
    cached = tokens;
    await storage.set(tokens);
  }

  async function clearTokens(): Promise<void> {
    cached = null;
    ephemeralToken = undefined;
    await storage.remove();
  }

  async function authorizationFor(
    identity: RequestIdentity
  ): Promise<string | undefined> {
    if (identity === 'preAuth') {
      return ephemeralToken ? `Bearer ${ephemeralToken}` : undefined;
    }

    if (identity === 'access') {
      const tokens = await readTokens();
      return tokens ? `Bearer ${tokens.accessToken}` : undefined;
    }

    return undefined;
  }

  async function applyEffect(effect: SessionEffect, response: Response): Promise<void> {
    if (effect === 'end') {
      await clearTokens();
      return;
    }

    const body = await readSessionBody(response);
    if (!body || typeof body.token !== 'string') {
      // A registration step that did not complete, or a poll that found
      // nothing yet. Nothing to hold.
      return;
    }

    if (effect === 'ephemeral') {
      ephemeralToken = body.token;
      return;
    }

    // A rotation that reissues only the access token (an organization switch)
    // keeps the refresh token the session already has.
    const refreshToken =
      typeof body.refreshToken === 'string'
        ? body.refreshToken
        : (await readTokens())?.refreshToken;

    if (!refreshToken) {
      return;
    }

    await writeTokens({ accessToken: body.token, refreshToken });
    ephemeralToken = undefined;
  }

  // One refresh at a time. The auth API rotates refresh tokens and treats a
  // replayed one as theft, revoking the whole chain, so two requests that hit a
  // 401 together must share a single rotation rather than each send the token.
  let refreshing: Promise<boolean> | null = null;

  function refreshOnce(): Promise<boolean> {
    if (!refreshing) {
      refreshing = (async () => {
        const tokens = await readTokens();
        if (!tokens) return false;

        const response = await fetchImpl(
          buildUrl(options.apiHost, basePath, '/refresh'),
          withHeaders(
            { method: 'POST' },
            {
              [AUTH_TRANSPORT_HEADER]: 'bearer',
              Authorization: `Bearer ${tokens.refreshToken}`,
            }
          )
        );

        if (!response.ok) {
          // Whether the chain was revoked or the token merely expired, there is
          // no session left to hold.
          await clearTokens();
          return false;
        }

        await applyEffect('issue', response);
        return true;
      })().finally(() => {
        refreshing = null;
      });
    }

    return refreshing;
  }

  async function send(
    url: string,
    init: RequestInit | undefined,
    identity: RequestIdentity,
    markTransport: boolean
  ) {
    const authorization = await authorizationFor(identity);

    return fetchImpl(
      url,
      withHeaders(init, {
        ...(markTransport ? { [AUTH_TRANSPORT_HEADER]: 'bearer' } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      })
    );
  }

  // An expired access token is the one 401 this layer can do something about.
  // Retried once; a second 401 is the caller's to handle.
  async function sendWithRefresh(
    url: string,
    init: RequestInit | undefined,
    identity: RequestIdentity,
    markTransport: boolean
  ) {
    let response = await send(url, init, identity, markTransport);

    if (response.status === 401 && identity === 'access' && (await readTokens())) {
      if (await refreshOnce()) {
        response = await send(url, init, identity, markTransport);
      }
    }

    return response;
  }

  return {
    mode,
    clearTokens,
    fetch: async (input, init) => {
      const path = normalizePath(input);
      const rule = resolveRouteRule(path);

      const response = await sendWithRefresh(
        buildUrl(options.apiHost, basePath, path),
        init,
        rule.identity,
        true
      );

      if (response.ok && rule.effect) {
        await applyEffect(rule.effect, response);
      }

      return response;
    },
    // The transport header is the adapter's; an application's own API only
    // needs the bearer token, which requireAuth reads.
    authorizedFetch: (input, init) =>
      sendWithRefresh(String(input), init, 'access', false),
  };
}
