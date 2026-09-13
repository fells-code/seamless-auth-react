# @seamless-auth/client

## 0.1.0

### Minor Changes

- 93a35b7: Put the platform behind ports, and add a bearer transport with token custody to the client core.

  The client spoke one contract: cookies to a server adapter at `/auth`, with the browser's WebAuthn
  API and `window.location` reached directly. A native binding has none of those, so the pieces that
  differ by platform are now ports a binding supplies, with the browser implementations as the
  defaults. A web application configures nothing and behaves exactly as before.
  - `transport` on `createSeamlessAuthClient` (and `AuthProvider`): cookie transport is unchanged;
    `{ mode: 'bearer', tokenStorage }` makes the client hold the auth API's own tokens. Every request
    carries `x-seamless-auth-transport: bearer`; pre-auth routes carry the ephemeral token that
    `/login` or `/registration/register` returned, kept in memory only; signed-in routes carry the
    access token; the pair a sign-in returns is written through a `TokenStoragePort`; a 401 on a
    signed-in route triggers one `POST /refresh` and one retry, with at most one refresh in flight
    because the auth API revokes the chain on a replayed refresh token. Which routes take which
    token is one table, mirroring the server adapter's, rather than an annotation at each of the
    forty call sites.
  - `PasskeyPort` (`isSupported`, `isPlatformAuthenticatorAvailable`, `create`, `get`) replaces the
    direct SimpleWebAuthn calls at the four ceremony sites. `createBrowserPasskeyPort()` is the
    default. A port reports an authenticator refusal with `PasskeyCeremonyError`, or any error with a
    DOMException `name` and a string `code`, which the client turns into the same result a browser
    failure gave. The PRF helpers no longer depend on SimpleWebAuthn at runtime.
  - `OAuthRedirectPort` replaces `window.location.assign` in the built-in provider buttons.
    `createBrowserOAuthRedirect()` is the default; a port that receives the callback itself resolves
    with `code` and `state`, and the buttons finish the login on the spot.
  - `TokenStoragePort` with `createMemoryTokenStorage()`.
  - `client.authorizedFetch(input, init)` and `useAuthorizedFetch()`: a fetch for the application's
    own API that carries the session the way the transport does (cookies, or the access token with
    one refresh-and-retry on a 401). A path resolves on `apiHost`. This is what a native app uses to
    call routes behind `requireAuth`.
  - `createAuthSession` accepts the client options (or a ready-made `client`) and exposes the client
    it drives as `session.client`. `useAuthClient()` returns that same instance rather than building a
    second one, which bearer transport needs: the client holds the sign-in in flight.
  - `AuthProvider` gains `transport` and `ports` props and exposes `client` and `ports` on the
    context. `usePasskeySupport()` reads the passkey port.

  Tracks fells-code/seamless-auth-react#124, #125, #127 and #128.

- f8f0dfe: Split the framework-agnostic core into `@seamless-auth/client`, and make this repository an npm workspace that publishes both packages.

  `@seamless-auth/react` was one package holding two layers: the headless client, session store, and result types that any binding needs, and the React provider, hooks, and screens on top. A React Native binding is next, and it must share the first layer rather than copy it, since the session state machine is the worst place for two implementations to drift (#64).

  `@seamless-auth/client` now carries `createSeamlessAuthClient`, `createAuthSession`, `SessionStoragePort` and its implementations, `createFetchWithAuth`, the error and result types, the PRF helpers, role matching, and the wire type aliases. `@seamless-auth/react` depends on it and re-exports the same public surface it did before, so an application installing `@seamless-auth/react` sees no change in what it imports or how it behaves.

  Packaging only: no runtime behaviour changes in either package.
