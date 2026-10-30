# @seamless-auth/client

## 0.8.1

### Patch Changes

- 194af06: The source repository is now `fells-code/seamless-auth-js`. Package `repository`, `bugs` and `homepage` links point at the new name, and releases are published with npm trusted publishing and provenance from that repository.
- b04166c: Publish from the renamed seamless-auth-js repository through npm trusted publishing, so provenance points at the new repository. Refreshes the lockfile for non-breaking dependency advisories. No runtime changes.

## 0.8.0

### Minor Changes

- 44854d0: Add the auth API v0.20 recovery primitives to the client and the session store.
  - Recovery codes: `getRecoveryCodeStatus()`, `generateRecoveryCodes()` and `redeemRecoveryCode(code)`. Replacing an existing set needs a fresh step-up; the `403` it answers without one is recognized by `isStepUpRequired()`, and `generateRecoveryCodesWithStepUp()` runs the step-up and tries again.
  - Self-service account recovery: `startAccountRecovery(channel)`, `verifyAccountRecovery(code)`, `getAccountRecoveryStatus()`, `completeAccountRecovery()`, `cancelAccountRecovery(cancelToken)`, and for a signed-in owner `listAccountRecoveryRequests()` and `cancelAccountRecoveryRequest(id)`.
  - Recovery sessions: redeeming a code or completing a recovery issues a session that can only enroll a factor. `isRecoverySession()` on the client and `recoverySession` in the session state report it, and the session actions `redeemRecoveryCode` and `completeAccountRecovery` sign in with it. After a passkey registration or TOTP enrollment made from a recovery session the client refreshes the session (`POST /refresh`), so the new access token drops the recovery claim the adapters' guards refuse.
  - Flows for every binding: `loadRecoveryOptions()`, `recoveryCancelTokenFromHash()`, `cancelRecoveryFromLink()`, `recoveryErrorMessage()`, `recoveryCodesText()`, `passkeyKind()` and `passkeyDisplayName()`, plus `getRecoveryErrorCode()` and `isEnrollmentRequired()`.
  - Bearer transport routes each recovery route with the credential the auth API's adapter manifest gives it.

  Needs an auth API with account recovery (v0.20) and a server adapter that proxies its manifest routes.

- 8dbd3d8: Adds shared authenticator app (TOTP) flow helpers for the bundled screens: `signInWithTotp()`, `totpErrorMessage()`, `formatTotpSecret()` and `TOTP_CODE_LENGTH`.

  The bearer transport no longer refreshes and resends a request whose `401` names a rejected factor (`totp_verification_failed`, `totp_disable_failed`, `step_up_failed`, `invalid_recovery_code`). That `401` is the answer to a wrong code, not an expired token, and resending the same code only spent another attempt against the rate limit and lockout.

  `generateRecoveryCodesWithStepUp()` now reports a failed step-up as "Confirm it is you to replace your recovery codes." instead of naming the passkey, since the step-up can also be an authenticator app code.

- 8dbd3d8: Adds `verifyTotpLogin(code)`, which signs in with an authenticator app code on the sign-in `login()` started (`POST /totp/verify-login`). The bearer transport sends it on the pre-auth token and stores the session it issues.
- 8dbd3d8: Adds `qrCode(text)`, which turns the `otpauth://` URL from authenticator app enrollment into a QR code a phone camera can scan, with no extra dependency. It returns the symbol's `size` in modules (quiet zone included) and SVG `path` data, so any binding can render it as `<svg viewBox="0 0 {size} {size}"><path d="{path}" /></svg>`. It throws a `RangeError` for text too long for a QR code. `qrMatrix(text)` returns the raw module grid for custom rendering.

### Patch Changes

- e5e6680: The bearer redirect guard now works on React Native. Its `fetch` follows redirects itself and never sets `response.redirected`, so a response that a redirect took to another origin was handed back as if it came from the API. A bearer request now rejects with `UntrustedRedirectError` whenever the response's final URL differs from the one requested and is not on `apiHost` or `trustedOrigins`. On React Native this detects such a redirect after it happened rather than preventing it, so the token may already have been sent on the followed hop.
- e5e6680: The bearer `POST /refresh` no longer follows a redirect. It is sent with `redirect: 'manual'`, and any `3xx` answer, a redirect the browser hides, or a response that a platform followed to an origin outside `apiHost` and `trustedOrigins` (as React Native's `fetch` does) is refused with `UntrustedRedirectError`. The held session is cleared, because it can no longer be renewed through that server. Before, a redirect on the refresh route resent the refresh token to the redirect target.
- e5e6680: The OAuth redirect ports now open only an `https` authorization URL, or `http` on `localhost`, `127.0.0.1` or `[::1]` for local development. The browser port (`createBrowserOAuthRedirect`) and the React Native port (`createWebBrowserOAuthRedirect`) throw the new `UnsafeAuthorizationUrlError` for anything else, such as a `javascript:` or `data:` URL in any letter case or with embedded tabs, and never navigate to it. `startOAuthSignIn`, which every bundled sign-in screen uses, reports that as a provider that could not start. A custom `OAuthRedirectPort` can use the new `assertNavigableAuthorizationUrl(url)`. Auth API 0.19.4 already refuses to store or return such a URL, so this guards against an older or misconfigured server.
- e5e6680: A client method whose request throws now keeps the thrown error as `error.cause`. Every such failure used to arrive as the same status `0` error with nothing to tell them apart, so an app could not distinguish an `UntrustedOriginError`, an `UntrustedRedirectError` or a refused refresh from a network failure. Check `error.cause instanceof UntrustedRedirectError` (or another error class) to show a more specific message. The `message` and `status` are unchanged.
- dc52b23: Update `@seamless-auth/types` to 0.31.0, the contract for auth server v0.20.
- a5956b0: Update `@seamless-auth/types` to 0.33.0. `AccountRecoveryRequest`, `AccountRecoveryRequestsResult` and `RecoveryErrorCode` now alias the upstream shapes, and `RecoveryErrorCode` gains `enrollment_required`.

  The recovery session flag is now read from the `recovery` field of `/users/me` as well, so `isRecoverySession()` and the session state's `recoverySession` survive a reload, a background revalidation and `initialSession`. A restored recovery session is sent to enrollment by the bundled sign-in screen, and the session is refreshed after a passkey or TOTP enrollment made from it.

## 0.7.1

### Patch Changes

- f21867d: OAuth sign-in now carries the state binding the auth server returns from `POST /oauth/:providerId/start` back to the callback. The session actions `startOAuthLogin` and `finishOAuthLogin` (and so `useAuth()` in React and React Native, and the Angular, Vue and Svelte bindings) store the binding with its state, attach it to the matching callback, and clear it afterwards, so apps that call these actions directly need no code change. The binding is kept in `sessionStorage` under `seamless:oauth:binding` in a browser and in memory elsewhere, and is never sent to the provider or put in a URL. `startOAuthSignIn` passes it explicitly when an in-app browser hands the callback back, and now refuses a callback whose state is not the one it started.

  `StartOAuthLoginResult` gains an optional `binding` and `FinishOAuthLoginInput` an optional `binding`. Older auth servers return no binding and are unaffected. Auth API 0.19.x with fells-code/seamless-auth-api#463 refuses a callback without the binding, so upgrade this SDK before or with that API release.

## 0.7.0

### Minor Changes

- 782583c: In bearer transport, a request that carries a token no longer follows a redirect to an origin outside `apiHost` and `trustedOrigins`. The client asks `fetch` for `redirect: 'manual'`, follows a redirect to a trusted origin itself (up to five hops, turning a `303`, or a `301` or `302` after a POST, into a GET as `fetch` does), and rejects any other with the new `UntrustedRedirectError` without sending the token on. Where the platform follows redirects regardless, as React Native's `fetch` does, a response that ended on another origin is rejected instead. A caller that sets `redirect` itself keeps that choice, and the final-origin check still applies. Requests without a token, and cookie transport, are unchanged.

### Patch Changes

- e3cf1f9: `authorizedFetch` works again for an app that serves `/auth` on its own origin (`apiHost: ""`, as `<AuthProvider apiHost="">`). Since 0.5.0 it refused every path in that setup with `UntrustedOriginError`, because a path stayed relative and the origin check could not read an origin from it. A path now resolves on the page's own origin, which is trusted. Without a page (server rendering, React Native) an empty `apiHost` still sends nothing.

## 0.6.0

### Minor Changes

- 59802e2: Add a confirmation step for magic links opened on another device.

  A magic link opened on a device other than the one that asked for it now waits for the reader to approve it (auth API 0.19.0 and later). The bundled verify screens show which kind of device asked and when, and offer "Yes, sign in that device" or "No, this wasn't me". Approving signs in the requesting device and tells the reader to return to it; declining changes nothing.

  `@seamless-auth/client` adds `client.confirmMagicLink(token)`, the `getMagicLinkConfirmation`, `isMagicLinkConfirmationRequired`, `describeMagicLinkDevice`, `magicLinkConfirmationPrompt` and `confirmMagicLinkSignIn` helpers, and the `MagicLinkConfirmation` and `MagicLinkDeviceClass` types. In bearer mode the verify call now sends the sign-in's ephemeral token when one is held. A custom verify screen that treats every failure as an invalid link should check `getMagicLinkConfirmation(error)` first.

  The React Native README describes the new step for apps that handle magic links.

## 0.5.0

### Minor Changes

- d1e3310: `authorizedFetch` (and `useAuthorizedFetch`) now sends the session only to `apiHost` and to origins you list in the new `trustedOrigins` option. A request to any other origin rejects with `UntrustedOriginError` and is never sent, so the session cookies, or in React Native the access token, cannot reach a third party through it. Paths, and full URLs on `apiHost`, work as before; a relative URL that does not start with `/` is now refused, and each `trustedOrigins` entry must be a bare `https` origin (`http` only on localhost). If your own API is served from a different origin than the auth adapter, add that origin: `transport: { trustedOrigins: ['https://api.example.com'] }` on the React `AuthProvider`, the `trustedOrigins` prop on the React Native `AuthProvider`, or `trustedOrigins` in `provideSeamlessAuth`, which `seamlessAuthInterceptor` also honours.

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
