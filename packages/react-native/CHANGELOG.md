# @seamless-auth/react-native

## 0.4.1

### Patch Changes

- 194af06: The source repository is now `fells-code/seamless-auth-js`. Package `repository`, `bugs` and `homepage` links point at the new name, and releases are published with npm trusted publishing and provenance from that repository.
- b04166c: Publish from the renamed seamless-auth-js repository through npm trusted publishing, so provenance points at the new repository. Refreshes the lockfile for non-breaking dependency advisories. No runtime changes.
- Updated dependencies [194af06]
- Updated dependencies [b04166c]
  - @seamless-auth/client@0.8.1

## 0.4.0

### Minor Changes

- 44854d0: Add the auth API v0.20 recovery primitives to the client and the session store.
  - Recovery codes: `getRecoveryCodeStatus()`, `generateRecoveryCodes()` and `redeemRecoveryCode(code)`. Replacing an existing set needs a fresh step-up; the `403` it answers without one is recognized by `isStepUpRequired()`, and `generateRecoveryCodesWithStepUp()` runs the step-up and tries again.
  - Self-service account recovery: `startAccountRecovery(channel)`, `verifyAccountRecovery(code)`, `getAccountRecoveryStatus()`, `completeAccountRecovery()`, `cancelAccountRecovery(cancelToken)`, and for a signed-in owner `listAccountRecoveryRequests()` and `cancelAccountRecoveryRequest(id)`.
  - Recovery sessions: redeeming a code or completing a recovery issues a session that can only enroll a factor. `isRecoverySession()` on the client and `recoverySession` in the session state report it, and the session actions `redeemRecoveryCode` and `completeAccountRecovery` sign in with it. After a passkey registration or TOTP enrollment made from a recovery session the client refreshes the session (`POST /refresh`), so the new access token drops the recovery claim the adapters' guards refuse.
  - Flows for every binding: `loadRecoveryOptions()`, `recoveryCancelTokenFromHash()`, `cancelRecoveryFromLink()`, `recoveryErrorMessage()`, `recoveryCodesText()`, `passkeyKind()` and `passkeyDisplayName()`, plus `getRecoveryErrorCode()` and `isEnrollmentRequired()`.
  - Bearer transport routes each recovery route with the credential the auth API's adapter manifest gives it.

  Needs an auth API with account recovery (v0.20) and a server adapter that proxies its manifest routes.

### Patch Changes

- e5e6680: The bearer redirect guard now works on React Native. Its `fetch` follows redirects itself and never sets `response.redirected`, so a response that a redirect took to another origin was handed back as if it came from the API. A bearer request now rejects with `UntrustedRedirectError` whenever the response's final URL differs from the one requested and is not on `apiHost` or `trustedOrigins`. On React Native this detects such a redirect after it happened rather than preventing it, so the token may already have been sent on the followed hop.
- e5e6680: The bearer `POST /refresh` no longer follows a redirect. It is sent with `redirect: 'manual'`, and any `3xx` answer, a redirect the browser hides, or a response that a platform followed to an origin outside `apiHost` and `trustedOrigins` (as React Native's `fetch` does) is refused with `UntrustedRedirectError`. The held session is cleared, because it can no longer be renewed through that server. Before, a redirect on the refresh route resent the refresh token to the redirect target.
- e5e6680: The OAuth redirect ports now open only an `https` authorization URL, or `http` on `localhost`, `127.0.0.1` or `[::1]` for local development. The browser port (`createBrowserOAuthRedirect`) and the React Native port (`createWebBrowserOAuthRedirect`) throw the new `UnsafeAuthorizationUrlError` for anything else, such as a `javascript:` or `data:` URL in any letter case or with embedded tabs, and never navigate to it. `startOAuthSignIn`, which every bundled sign-in screen uses, reports that as a provider that could not start. A custom `OAuthRedirectPort` can use the new `assertNavigableAuthorizationUrl(url)`. Auth API 0.19.4 already refuses to store or return such a URL, so this guards against an older or misconfigured server.
- dc52b23: Update `@seamless-auth/types` to 0.31.0, the contract for auth server v0.20.
- a5956b0: Update `@seamless-auth/types` to 0.33.0. `AccountRecoveryRequest`, `AccountRecoveryRequestsResult` and `RecoveryErrorCode` now alias the upstream shapes, and `RecoveryErrorCode` gains `enrollment_required`.

  The recovery session flag is now read from the `recovery` field of `/users/me` as well, so `isRecoverySession()` and the session state's `recoverySession` survive a reload, a background revalidation and `initialSession`. A restored recovery session is sent to enrollment by the bundled sign-in screen, and the session is refreshed after a passkey or TOTP enrollment made from it.

- Updated dependencies [e5e6680]
- Updated dependencies [e5e6680]
- Updated dependencies [e5e6680]
- Updated dependencies [44854d0]
- Updated dependencies [e5e6680]
- Updated dependencies [8dbd3d8]
- Updated dependencies [8dbd3d8]
- Updated dependencies [8dbd3d8]
- Updated dependencies [dc52b23]
- Updated dependencies [a5956b0]
  - @seamless-auth/client@0.8.0

## 0.3.3

### Patch Changes

- f21867d: OAuth sign-in now carries the state binding the auth server returns from `POST /oauth/:providerId/start` back to the callback. The session actions `startOAuthLogin` and `finishOAuthLogin` (and so `useAuth()` in React and React Native, and the Angular, Vue and Svelte bindings) store the binding with its state, attach it to the matching callback, and clear it afterwards, so apps that call these actions directly need no code change. The binding is kept in `sessionStorage` under `seamless:oauth:binding` in a browser and in memory elsewhere, and is never sent to the provider or put in a URL. `startOAuthSignIn` passes it explicitly when an in-app browser hands the callback back, and now refuses a callback whose state is not the one it started.

  `StartOAuthLoginResult` gains an optional `binding` and `FinishOAuthLoginInput` an optional `binding`. Older auth servers return no binding and are unaffected. Auth API 0.19.x with fells-code/seamless-auth-api#463 refuses a callback without the binding, so upgrade this SDK before or with that API release.

- Updated dependencies [f21867d]
  - @seamless-auth/client@0.7.1

## 0.3.2

### Patch Changes

- 782583c: In bearer transport, a request that carries a token no longer follows a redirect to an origin outside `apiHost` and `trustedOrigins`. The client asks `fetch` for `redirect: 'manual'`, follows a redirect to a trusted origin itself (up to five hops, turning a `303`, or a `301` or `302` after a POST, into a GET as `fetch` does), and rejects any other with the new `UntrustedRedirectError` without sending the token on. Where the platform follows redirects regardless, as React Native's `fetch` does, a response that ended on another origin is rejected instead. A caller that sets `redirect` itself keeps that choice, and the final-origin check still applies. Requests without a token, and cookie transport, are unchanged.
- Updated dependencies [782583c]
- Updated dependencies [e3cf1f9]
  - @seamless-auth/client@0.7.0

## 0.3.1

### Patch Changes

- 59802e2: Add a confirmation step for magic links opened on another device.

  A magic link opened on a device other than the one that asked for it now waits for the reader to approve it (auth API 0.19.0 and later). The bundled verify screens show which kind of device asked and when, and offer "Yes, sign in that device" or "No, this wasn't me". Approving signs in the requesting device and tells the reader to return to it; declining changes nothing.

  `@seamless-auth/client` adds `client.confirmMagicLink(token)`, the `getMagicLinkConfirmation`, `isMagicLinkConfirmationRequired`, `describeMagicLinkDevice`, `magicLinkConfirmationPrompt` and `confirmMagicLinkSignIn` helpers, and the `MagicLinkConfirmation` and `MagicLinkDeviceClass` types. In bearer mode the verify call now sends the sign-in's ephemeral token when one is held. A custom verify screen that treats every failure as an invalid link should check `getMagicLinkConfirmation(error)` first.

  The React Native README describes the new step for apps that handle magic links.

- Updated dependencies [59802e2]
  - @seamless-auth/client@0.6.0

## 0.3.0

### Minor Changes

- d1e3310: `authorizedFetch` (and `useAuthorizedFetch`) now sends the session only to `apiHost` and to origins you list in the new `trustedOrigins` option. A request to any other origin rejects with `UntrustedOriginError` and is never sent, so the session cookies, or in React Native the access token, cannot reach a third party through it. Paths, and full URLs on `apiHost`, work as before; a relative URL that does not start with `/` is now refused, and each `trustedOrigins` entry must be a bare `https` origin (`http` only on localhost). If your own API is served from a different origin than the auth adapter, add that origin: `transport: { trustedOrigins: ['https://api.example.com'] }` on the React `AuthProvider`, the `trustedOrigins` prop on the React Native `AuthProvider`, or `trustedOrigins` in `provideSeamlessAuth`, which `seamlessAuthInterceptor` also honours.

### Patch Changes

- Updated dependencies [d1e3310]
  - @seamless-auth/client@0.5.0

## 0.2.3

### Patch Changes

- 5041bb3: `@seamless-auth/client` now exports the step logic behind the bundled sign-in screens: `beginSignIn`, `registerWithEmail`, `requestOtp` and `verifyOtp`, `watchMagicLink` and `finishMagicLinkSignIn`, `startOAuthSignIn` and `completeOAuthCallback`, `enrollPasskey`, `loadLoginMethods`, `fallbackSignInOptions`, `detectPasskeySupport`, `safeReturnPath` and `inAppPath`, plus `isValidEmail`, `isValidPhoneNumber` and `parseUserAgent`. A custom UI in any framework can call them, and every binding's screens now share one implementation. The React and React Native screens behave as before.
- Updated dependencies [5041bb3]
- Updated dependencies [5041bb3]
  - @seamless-auth/client@0.4.0

## 0.2.2

### Patch Changes

- 19f8f1b: Depend on `@seamless-auth/types` `^0.28.0` (was `^0.26.0`), so the SDK's wire types track the current auth API contract. No SDK request or response shape changes; 0.27.0 and 0.28.0 only add admin system config and dashboard metrics fields.
- Updated dependencies [19f8f1b]
  - @seamless-auth/client@0.3.2

## 0.2.1

### Patch Changes

- 4a2d6ff: Support Node 22 and newer. The `engines` field now requires `>=22` instead of `>=24.0.0 <25.0.0`, and CI runs on Node 22, 24, and the latest release (fells-code/seamless-auth-api#339).
- Updated dependencies [4a2d6ff]
  - @seamless-auth/client@0.3.1

## 0.2.0

### Minor Changes

- 0fcd830: Relicense from AGPL-3.0-only to the Apache License, Version 2.0 (fells-code/seamless-auth-api#335). The `LICENSE` file, the `license` field and the license header in source files now say Apache-2.0, and the AGPL summary in `LICENSE.md` is removed.

### Patch Changes

- 7a26a6c: Depend on `@seamless-auth/types` `^0.26.0` (was `^0.25.0`), so the SDK's wire types track the current auth API contract.
- Updated dependencies [0fcd830]
- Updated dependencies [7a26a6c]
  - @seamless-auth/client@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [419025e]
- Updated dependencies [0dfe622]
  - @seamless-auth/client@0.2.0

## 0.1.0

### Minor Changes

- 280ceee: First release of `@seamless-auth/react-native`, the headless React Native binding.

  An `AuthProvider` over the shared session store, always on bearer transport; `useAuth`,
  `useAuthClient`, `useLoginMethods` and `usePasskeySupport`; and the native ports:
  `createSecureStoreTokenStorage` (expo-secure-store), `createNativePasskeyPort`
  (react-native-passkeys, mapping native failures onto the DOMException names the client's error
  readers understand), `createWebBrowserOAuthRedirect` (expo-web-browser auth session, resolving the
  callback's `code` and `state`), and `describeDevice` for passkey metadata. Each port takes its
  native module as a parameter, so an app installs only what it uses and Metro never resolves a
  module it did not.

  No screens: the app brings its own, the same way a web app that skips `AuthRoutes` does. The flows,
  session state, and token custody come from `@seamless-auth/client`.

### Patch Changes

- Updated dependencies [93a35b7]
- Updated dependencies [f8f0dfe]
  - @seamless-auth/client@0.1.0
