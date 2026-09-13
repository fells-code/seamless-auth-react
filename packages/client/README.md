# @seamless-auth/client

The framework-agnostic core of the Seamless Auth client SDKs. It holds the
headless auth client (`createSeamlessAuthClient`), the session store
(`createAuthSession`), and the result and error types that every binding shares.
`@seamless-auth/react` is a thin binding over this package, and it is the
package a React Native or other non-React binding builds on.

If you are building a React application, install
[`@seamless-auth/react`](https://www.npmjs.com/package/@seamless-auth/react)
instead; it depends on this package and re-exports what an application needs.

## Install

```bash
npm install @seamless-auth/client
```

## What is here

- `createSeamlessAuthClient({ apiHost })`: the request choreography for login,
  registration, OTP, magic link, passkey, OAuth, step-up, TOTP, credential and
  organization flows against a Seamless Auth server adapter mounted at `/auth`.
  Every method returns a `SeamlessAuthResult<T>`.
- `createAuthSession({ apiHost, storage?, detectPreviousSignIn? })`: the session
  state machine (`getState`, `subscribe`, `actions`, `destroy`), designed to be
  bound with `useSyncExternalStore` or an equivalent.
- `SessionStoragePort` with browser and memory implementations.
- `SeamlessAuthError`, `getWebAuthnErrorDetail`, `getOAuthErrorCode`,
  `isUnauthenticated`, and the other error readers.
- PRF helpers for passkey-derived secrets.
- `hasScopedRole` / `roleGrantsAccess`, the same role matching the auth API and
  server adapters apply.

The wire types come from `@seamless-auth/types`; this package aliases them rather
than redeclaring shapes.

## Transport

`createSeamlessAuthClient` takes a `transport` option:

- cookie transport, the default: requests go to `${apiHost}/auth/*` with
  `credentials: 'include'` and the server adapter holds the tokens. The browser
  contract.
- bearer transport (`{ mode: 'bearer', tokenStorage }`): the client holds the auth
  API's own tokens. Every request carries `x-seamless-auth-transport: bearer`;
  pre-auth routes carry the ephemeral token `/login` or `/registration/register`
  returned (kept in memory only), signed-in routes carry the access token; the
  pair a sign-in returns is written through the `TokenStoragePort`; a 401 on a
  signed-in route triggers one `POST /refresh` and one retry, with at most one
  refresh in flight. The native contract.

Which routes take which token is one table, `ROUTE_RULES` in `src/transport.ts`,
mirroring the server adapter's own map.

`client.authorizedFetch(input, init)` is a fetch for the application's own API
that carries the session the same way: cookies in cookie transport, the access
token with one refresh-and-retry on a 401 in bearer transport. It never reads
tokens out of the response, since that body is the application's.

## Ports

- `PasskeyPort`: who runs the WebAuthn ceremonies. `createBrowserPasskeyPort()`
  (SimpleWebAuthn) is the default. A port throws `PasskeyCeremonyError` (or an
  error with a DOMException `name` and a string `code`) when the authenticator
  refuses, which the client turns into the same result a browser failure gives.
- `TokenStoragePort`: where a bearer session lives. `createMemoryTokenStorage()`
  is the default and does not survive a restart; a native binding supplies one
  over the platform keystore.
- `OAuthRedirectPort`: how the provider is opened. `createBrowserOAuthRedirect()`
  navigates the page; a native port opens an in-app browser session and resolves
  with the callback's `code` and `state`.

`createAuthSession` accepts the same client options, or a ready-made `client`,
and exposes the client it drives as `session.client` so a binding hands out one
instance rather than two.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
