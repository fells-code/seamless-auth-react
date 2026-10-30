# @seamless-auth/vue

## 0.3.1

### Patch Changes

- 194af06: The source repository is now `fells-code/seamless-auth-js`. Package `repository`, `bugs` and `homepage` links point at the new name, and releases are published with npm trusted publishing and provenance from that repository.
- b04166c: Publish from the renamed seamless-auth-js repository through npm trusted publishing, so provenance points at the new repository. Refreshes the lockfile for non-breaking dependency advisories. No runtime changes.
- Updated dependencies [194af06]
- Updated dependencies [b04166c]
  - @seamless-auth/client@0.8.1

## 0.3.0

### Minor Changes

- 9b8a9fb: The bundled screens support authenticator apps (TOTP).
  - `createSeamlessAuthRoutes()` adds `register-authenticator` (`SaRegisterAuthenticator`), which shows a QR code, the setup key with a copy button and an `otpauth://` link, verifies the first code and then continues where passkey enrolment does, and `authenticator-code` (`SaAuthenticatorCode`), which finishes a sign-in with a code from the app. Wrong or reused codes, lockout and rate limits each get a clear message.
  - The sign-in screen's fallback options always include "Use an authenticator app" once a sign-in has started. The API answers a code for any account, so this reveals nothing about the account.
  - `SaRegisterPasskey` offers "Use an authenticator app" on a device that cannot register a passkey (unless the application signs in with passkeys only, where the API would refuse the app), and always for a recovery session, which can no longer skip enrolment. Adding the app ends the recovery restriction.
  - `SaAuthenticatorAppSettings`, exported from the package root and router-free, shows whether an authenticator app is set up and lets the user add one or turn it off with a current code.
  - `useSeamlessAuth()` adds `recoverySession`, and the package re-exports the `TotpStatus` type.

  Needs an auth API with TOTP sign-in (`POST /totp/verify-login`) and a server adapter that proxies the `/totp` routes.

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

## 0.2.1

### Patch Changes

- Updated dependencies [782583c]
- Updated dependencies [e3cf1f9]
  - @seamless-auth/client@0.7.0

## 0.2.0

### Minor Changes

- 59802e2: Add a confirmation step for magic links opened on another device.

  A magic link opened on a device other than the one that asked for it now waits for the reader to approve it (auth API 0.19.0 and later). The bundled verify screens show which kind of device asked and when, and offer "Yes, sign in that device" or "No, this wasn't me". Approving signs in the requesting device and tells the reader to return to it; declining changes nothing.

  `@seamless-auth/client` adds `client.confirmMagicLink(token)`, the `getMagicLinkConfirmation`, `isMagicLinkConfirmationRequired`, `describeMagicLinkDevice`, `magicLinkConfirmationPrompt` and `confirmMagicLinkSignIn` helpers, and the `MagicLinkConfirmation` and `MagicLinkDeviceClass` types. In bearer mode the verify call now sends the sign-in's ephemeral token when one is held. A custom verify screen that treats every failure as an invalid link should check `getMagicLinkConfirmation(error)` first.

  The React Native README describes the new step for apps that handle magic links.

### Patch Changes

- Updated dependencies [59802e2]
  - @seamless-auth/client@0.6.0

## 0.1.0

### Minor Changes

- bab12a7: First release of `@seamless-auth/vue`, the Vue binding for Seamless Auth (Vue 3.5 and later).
  - `createSeamlessAuth({ apiHost })` is a plugin that gives each application its own session, and `useSeamlessAuth()` exposes it as read-only refs (`user`, `isAuthenticated`, `loading`, and the rest) plus every auth action.
  - `@seamless-auth/vue/router` provides `authGuard`, `guestGuard`, `requireAuth({ roles })` and `requireGuest()` for `vue-router` 4.4 and later. Each one waits for the session to be read.
  - `createSeamlessAuthRoutes()` adds the sign-in screens (login, email and phone codes, magic link, OAuth callback, passkey login and enrolment) as named routes under any base path. They are themed with the same `--seamless-*` properties as the React and Angular screens.

  The binding uses cookie transport only: tokens stay in the server adapter, and nothing is written where page scripts can read it.

### Patch Changes

- Updated dependencies [d1e3310]
  - @seamless-auth/client@0.5.0
