# @seamless-auth/vue

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
