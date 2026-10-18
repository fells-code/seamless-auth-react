# @seamless-auth/svelte

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
