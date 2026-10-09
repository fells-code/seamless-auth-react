# @seamless-auth/vue

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
