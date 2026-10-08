---
'@seamless-auth/angular': minor
---

First release of `@seamless-auth/angular`, the Angular binding for Seamless Auth (Angular 20, 21 and 22).

- `provideSeamlessAuth({ apiHost })` configures the session for a standalone application.
- `SeamlessAuth` is an injectable service that exposes the session as signals (`user`, `isAuthenticated`, `loading`, and the rest) and observables (`state$`, `user$`, `isAuthenticated$`), plus every auth action.
- `authGuard`, `guestGuard`, `requireAuth({ roles })` and `requireGuest()` are functional guards for `canActivate`, `canActivateChild` and `canMatch`. Each one waits for the session to be read.
- `seamlessAuthInterceptor` sends the session cookies with `HttpClient` requests to `apiHost`, and only there.
- `@seamless-auth/angular/routes` provides standalone sign-in screens (login, email and phone codes, magic link, OAuth callback, passkey login and enrolment) themed with the same `--seamless-*` properties as the React screens.

The binding uses cookie transport only: tokens stay in the server adapter, and nothing is written where page scripts can read it.
