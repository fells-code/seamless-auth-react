# @seamless-auth/angular

## 0.4.0

### Minor Changes

- 2f18490: Add authenticator app (TOTP) screens to the Angular binding. Once a sign-in is under way, the login screen offers "Use an authenticator app", which opens the new `authenticator-code` screen (`SaAuthenticatorCode`) and explains a wrong or reused code, a lockout and rate limiting. The new `register-authenticator` screen (`SaRegisterAuthenticator`) shows a QR code, the setup key with a copy button and an `otpauth://` link, verifies the first code, and continues where `register-passkey` does. `register-passkey` offers it to a recovery session, which can no longer skip enrollment, and on a device that cannot register a passkey; enrolling an app lifts the recovery restriction. `SaAuthenticatorAppSettings` is a router-independent settings component that shows whether an app is set up, adds one, and turns it off with a current code. `SaAuthenticatorEnrollment` is exported for custom screens, `SaFallbackOptions` gains an `offerAuthenticator` input and an `authenticator` output, and the `SeamlessAuth` service gains a `recoverySession` signal.

### Patch Changes

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

## 0.3.1

### Patch Changes

- Updated dependencies [782583c]
- Updated dependencies [e3cf1f9]
  - @seamless-auth/client@0.7.0

## 0.3.0

### Minor Changes

- 59802e2: Add a confirmation step for magic links opened on another device.

  A magic link opened on a device other than the one that asked for it now waits for the reader to approve it (auth API 0.19.0 and later). The bundled verify screens show which kind of device asked and when, and offer "Yes, sign in that device" or "No, this wasn't me". Approving signs in the requesting device and tells the reader to return to it; declining changes nothing.

  `@seamless-auth/client` adds `client.confirmMagicLink(token)`, the `getMagicLinkConfirmation`, `isMagicLinkConfirmationRequired`, `describeMagicLinkDevice`, `magicLinkConfirmationPrompt` and `confirmMagicLinkSignIn` helpers, and the `MagicLinkConfirmation` and `MagicLinkDeviceClass` types. In bearer mode the verify call now sends the sign-in's ephemeral token when one is held. A custom verify screen that treats every failure as an invalid link should check `getMagicLinkConfirmation(error)` first.

  The React Native README describes the new step for apps that handle magic links.

### Patch Changes

- Updated dependencies [59802e2]
  - @seamless-auth/client@0.6.0

## 0.2.0

### Minor Changes

- d1e3310: `authorizedFetch` (and `useAuthorizedFetch`) now sends the session only to `apiHost` and to origins you list in the new `trustedOrigins` option. A request to any other origin rejects with `UntrustedOriginError` and is never sent, so the session cookies, or in React Native the access token, cannot reach a third party through it. Paths, and full URLs on `apiHost`, work as before; a relative URL that does not start with `/` is now refused, and each `trustedOrigins` entry must be a bare `https` origin (`http` only on localhost). If your own API is served from a different origin than the auth adapter, add that origin: `transport: { trustedOrigins: ['https://api.example.com'] }` on the React `AuthProvider`, the `trustedOrigins` prop on the React Native `AuthProvider`, or `trustedOrigins` in `provideSeamlessAuth`, which `seamlessAuthInterceptor` also honours.

### Patch Changes

- bab12a7: `requireAuth` now treats a server render without `initialSession` as signed out and redirects to `loginPath`, instead of admitting, so a protected page's data never renders into a response for a visitor the server could not identify. The browser decides again when the application boots. The OAuth callback and passkey enrolment screens no longer add the base href twice to the destination, and enrolment without a handed-over destination now goes to `signedInPath`. A guard waiting on the session no longer hangs if the application is destroyed first, and the stylesheet export is marked as a side effect so bundlers keep `import '@seamless-auth/angular/seamless-auth.css'`.
- Updated dependencies [d1e3310]
  - @seamless-auth/client@0.5.0

## 0.1.0

### Minor Changes

- 5041bb3: First release of `@seamless-auth/angular`, the Angular binding for Seamless Auth (Angular 20, 21 and 22).
  - `provideSeamlessAuth({ apiHost })` configures the session for a standalone application.
  - `SeamlessAuth` is an injectable service that exposes the session as signals (`user`, `isAuthenticated`, `loading`, and the rest) and observables (`state$`, `user$`, `isAuthenticated$`), plus every auth action.
  - `authGuard`, `guestGuard`, `requireAuth({ roles })` and `requireGuest()` are functional guards for `canActivate`, `canActivateChild` and `canMatch`. Each one waits for the session to be read.
  - `seamlessAuthInterceptor` sends the session cookies with `HttpClient` requests to `apiHost`, and only there.
  - `@seamless-auth/angular/routes` provides standalone sign-in screens (login, email and phone codes, magic link, OAuth callback, passkey login and enrolment) themed with the same `--seamless-*` properties as the React screens.

  The binding uses cookie transport only: tokens stay in the server adapter, and nothing is written where page scripts can read it.

### Patch Changes

- Updated dependencies [5041bb3]
- Updated dependencies [5041bb3]
  - @seamless-auth/client@0.4.0
