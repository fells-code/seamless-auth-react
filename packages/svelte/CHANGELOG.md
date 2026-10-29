# @seamless-auth/svelte

## 0.3.0

### Minor Changes

- 44854d0: The session exposes `recoverySession`, `redeemRecoveryCode(code)` and `completeAccountRecovery()` from `@seamless-auth/client`, for a custom account recovery screen.
- 0ec590c: The bundled screens cover authenticator apps (TOTP).
  - `SaRegisterAuthenticator` (`/register-authenticator`) adds an authenticator app: a QR code drawn in the page with no extra dependency, the setup key with a copy button and an `otpauth://` link, and the first code to confirm it. It ends on a success state, then continues where passkey enrolment does.
  - `SaAuthenticatorCode` (`/authenticator-code`) signs in with a code from the app, and explains a wrong or reused code, a lockout and a rate limit.
  - `SaLogin` offers "Use an authenticator app" with the other sign-in options. `SaRegisterPasskey` offers it when the device cannot register a passkey (unless the application signs in with passkeys only, where the API would refuse the app), and always to a recovery session, which can no longer skip enrolment. Enrolling an authenticator app lifts the recovery restriction.
  - `SaAuthenticatorAppSettings` is a router-free settings section: status, set up, and turn off with a current code.
  - `authRoutePaths` gains `registerAuthenticator` and `authenticatorCode`, and the package re-exports the `TotpStatus` type.

  Mount the two new screens at their paths (or pass `paths` to `createKitNavigator`). Needs a server adapter that proxies the auth API's `/totp/*` routes.

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

- d1a70a1: First release of `@seamless-auth/svelte`, the Svelte binding for Seamless Auth (Svelte 5).
  - `createSeamlessAuth({ apiHost })` creates a session whose properties (`user`, `isAuthenticated`, `loading`, and the rest) are runes, with every auth action. `setSeamlessAuth` and `getSeamlessAuth` share it through context.
  - `@seamless-auth/svelte/kit` provides `requireAuth(auth, { roles })` and `requireGuest(auth)` `load` guards, and `createKitNavigator` for the bundled screens, for SvelteKit 2.26 and later, and SvelteKit 3. Each guard waits for the session to be read.
  - Sign-in screens (`SaLogin`, `SaVerifyOtp`, `SaMagicLinkSent`, `SaVerifyMagicLink`, `SaOAuthCallback`, `SaPasskeyLogin`, `SaRegisterPasskey`) to mount at your routes, themed with the same `--seamless-*` properties as the other bindings. They navigate through an `AuthNavigator`, so any router can drive them.

  The binding uses cookie transport only: tokens stay in the server adapter, and nothing is written where page scripts can read it.
