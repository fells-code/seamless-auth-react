# @seamless-auth/angular

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
