# @seamless-auth/client

## 0.4.0

### Minor Changes

- 5041bb3: `@seamless-auth/client` now exports the step logic behind the bundled sign-in screens: `beginSignIn`, `registerWithEmail`, `requestOtp` and `verifyOtp`, `watchMagicLink` and `finishMagicLinkSignIn`, `startOAuthSignIn` and `completeOAuthCallback`, `enrollPasskey`, `loadLoginMethods`, `fallbackSignInOptions`, `detectPasskeySupport`, `safeReturnPath` and `inAppPath`, plus `isValidEmail`, `isValidPhoneNumber` and `parseUserAgent`. A custom UI in any framework can call them, and every binding's screens now share one implementation. The React and React Native screens behave as before.

### Patch Changes

- 5041bb3: The bundled screens now refuse a post-sign-in destination that a browser would read as another site. That covers a same-origin `returnTo` whose path starts with `//`, and a path hiding `//` behind a tab or newline. Older react-router 6 releases hand such a path to `window.location`, so it could have sent a user off-site.

## 0.3.2

### Patch Changes

- 19f8f1b: Depend on `@seamless-auth/types` `^0.28.0` (was `^0.26.0`), so the SDK's wire types track the current auth API contract. No SDK request or response shape changes; 0.27.0 and 0.28.0 only add admin system config and dashboard metrics fields.

## 0.3.1

### Patch Changes

- 4a2d6ff: Support Node 22 and newer. The `engines` field now requires `>=22` instead of `>=24.0.0 <25.0.0`, and CI runs on Node 22, 24, and the latest release (fells-code/seamless-auth-api#339).

## 0.3.0

### Minor Changes

- 0fcd830: Relicense from AGPL-3.0-only to the Apache License, Version 2.0 (fells-code/seamless-auth-api#335). The `LICENSE` file, the `license` field and the license header in source files now say Apache-2.0, and the AGPL summary in `LICENSE.md` is removed.

### Patch Changes

- 7a26a6c: Depend on `@seamless-auth/types` `^0.26.0` (was `^0.25.0`), so the SDK's wire types track the current auth API contract.

## 0.2.0

### Minor Changes

- 419025e: Support the Next.js App Router.
  - Every module in `@seamless-auth/react` now ships with a `'use client'` directive, so `AuthProvider` renders straight from a server layout. The build fails if the directive goes missing from any emitted file.
  - **Breaking:** `AuthRoutes` moved to `@seamless-auth/react/routes`, and `react-router-dom` is now an optional peer. Change `import { AuthRoutes } from '@seamless-auth/react'` to `import { AuthRoutes } from '@seamless-auth/react/routes'`. Applications that do not render the bundled screens no longer need react-router installed.
  - Fixed a hydration mismatch for returning users. `hasSignedInBefore` was read from `localStorage` on the client's first render, which the server could not match. The store now exposes `getServerState()`, and the provider hydrates from it.
  - `AuthProvider` and `createAuthSession` accept `initialSession`, a session the server already resolved (or `null`). The first paint renders it settled instead of loading, and the session then revalidates in the background.
  - `refreshSession({ background: true })` revalidates without reporting `loading`.

- 0dfe622: Support signing in through a legacy identity provider during a migration cutover (fells-code/seamless-auth-api#337).
  - `getOAuthErrorCode` recognises `oauth_provider_retired` (the user's organization no longer signs in with that provider) and `oauth_invalid_id_token`.
  - The bundled OAuth callback sends the user to passkey enrollment when the sign-in response carries `nextStep: 'enroll_passkey'`, and the passkey screen then continues to the `returnTo` the flow asked for instead of always going home.
  - The callback shows a specific message for both new codes.

  Requires `@seamless-auth/types` 0.25.0.

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
