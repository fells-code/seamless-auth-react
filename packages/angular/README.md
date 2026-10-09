# @seamless-auth/angular

[![npm version](https://img.shields.io/npm/v/@seamless-auth/angular.svg?label=%40seamless-auth%2Fangular)](https://www.npmjs.com/package/@seamless-auth/angular)
[![CI](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml/badge.svg)](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/fells-code/seamless-auth-react)](./LICENSE)

Angular bindings for Seamless Auth: an injectable `SeamlessAuth` service with signals and
observables, functional route guards, an `HttpClient` interceptor, and optional standalone sign-in
screens. It is a thin binding over [`@seamless-auth/client`](../client/README.md), the same core the
React bindings use, so the flows behave the same in both.

## Start here

New to Seamless Auth? The [self-hosted quickstart](https://docs.seamlessauth.com/start/quickstart/)
runs the full stack locally with Docker. The [compatibility matrix](https://docs.seamlessauth.com/build/ecosystem/#compatibility-matrix)
lists which package versions work together.

The browser talks only to your backend's `/auth` routes, served by a server adapter
(`@seamless-auth/express`, `fastify`, `nextjs`, or the Go, Rust and Python adapters). The adapter
keeps the tokens; the browser holds only HttpOnly cookies. This package has no bearer mode and never
writes a token to `localStorage`, `sessionStorage`, or anywhere page scripts can read it.

## Requirements

- Angular 20, 21 or 22 (`@angular/core`, `@angular/common`, `@angular/router`), and `rxjs` 7
- Standalone APIs. Zoneless and zone-based applications both work: state is held in signals
- A Seamless Auth server adapter mounted at `/auth` on `apiHost`

## Installation

```bash
npm install @seamless-auth/angular
```

## Quick start

### Configure it

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideSeamlessAuth, seamlessAuthInterceptor } from '@seamless-auth/angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideSeamlessAuth({ apiHost: 'https://app.example.com' }),
    // Optional: sends the session cookies with HttpClient calls to apiHost (and
    // trustedOrigins), and nowhere else.
    provideHttpClient(withInterceptors([seamlessAuthInterceptor])),
  ],
};
```

`provideSeamlessAuth` also takes a factory, which runs in an injection context. Use it to read
configuration at runtime:

```ts
provideSeamlessAuth(() => ({ apiHost: inject(RUNTIME_CONFIG).apiUrl }));
```

| Option                     | Default          | Purpose                                                     |
| -------------------------- | ---------------- | ----------------------------------------------------------- |
| `apiHost`                  | required         | Origin of the server adapter                                |
| `basePath`                 | `/auth`          | Where the adapter is mounted                                |
| `magicLinkRedirectUri`     | the deployment's | Where an emailed magic link lands                           |
| `autoDetectPreviousSignIn` | `true`           | Open the login screen on Sign In for a returning browser    |
| `initialSession`           | none             | A session the server already resolved, for server rendering |
| `ports`                    | browser          | `passkeys` and `oauthRedirect` ports                        |
| `fetch`                    | global `fetch`   | The fetch auth requests go through                          |
| `trustedOrigins`           | none             | Other origins of yours that may receive the session cookies |
| `signedInPath`             | `/`              | Where the bundled screens go after sign-in                  |
| `loginPath`                | `/login`         | Where `requireAuth` sends someone signed out                |

The session is read as soon as the application starts in the browser.

### Protect routes and mount the screens

```ts
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, requireAuth } from '@seamless-auth/angular';

export const routes: Routes = [
  { path: '', component: HomePage, canActivate: [authGuard] },
  {
    path: 'admin',
    component: AdminPage,
    canActivate: [requireAuth({ roles: 'org:admin' })],
  },
  {
    path: '',
    loadChildren: () =>
      import('@seamless-auth/angular/routes').then(m => m.seamlessAuthRoutes),
  },
];
```

The guards work as `canActivate`, `canActivateChild` and `canMatch`. They wait for the session to be
read before deciding, so reloading a protected page does not bounce a signed-in user to the login
screen.

| Guard                                   | Admits                                    | Otherwise                                                                                   |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `authGuard` / `requireAuth(options?)`   | A signed-in user, with `roles` when given | `redirectTo` (default `loginPath`); `forbiddenRedirectTo` or refusal when a role is missing |
| `guestGuard` / `requireGuest(options?)` | Someone signed out                        | `redirectTo` (default `signedInPath`)                                                       |

`roles` uses the same matching as the auth API, scoped roles such as `org:admin` included. A guard is
a convenience for navigation, not access control: your server still checks every request.

### Read session state

```ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SeamlessAuth } from '@seamless-auth/angular';

@Component({
  selector: 'app-account-menu',
  template: `
    @if (auth.user(); as user) {
      <span>{{ user.email }}</span>
      <button type="button" (click)="signOut()">Logout</button>
    }
  `,
})
export class AccountMenu {
  protected readonly auth = inject(SeamlessAuth);
  private readonly router = inject(Router);

  async signOut() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
```

## `SeamlessAuth` API

Signals: `state`, `user`, `isAuthenticated`, `loading`, `credentials`, `organizations`,
`activeOrganization`, `stepUpStatus`, `hasSignedInBefore`, plus `loginMethods`,
`loginMethodsLoading`, `passkeySupported` and `passkeySupportLoading`.

Observables: `state$`, `user$`, `isAuthenticated$`. Each emits the current value on subscribe.

Actions, each resolving to a `SeamlessAuthResult<T>` (`{ data, error }`) that never throws for an HTTP
failure: `login`, `handlePasskeyLogin`, `registerPasskey`, `refreshSession`, `logout`,
`logoutAllSessions`, `deleteUser`, `updateCredential`, `deleteCredential`, `switchOrganization`,
`listOAuthProviders`, `startOAuthLogin`, `finishOAuthLogin`, `refreshStepUpStatus`,
`verifyStepUpWithPasskey`, `verifyStepUpWithPasskeyPrf`, `verifyStepUpWithTotp`.

Also: `hasRole`, `hasScopedRole`, `markSignedIn`, `whenSettled()` (resolves once the session is read),
`loadLoginMethods()` and `checkPasskeySupport()` (each read once and cached), `authorizedFetch` (a
fetch for your own API that carries the cookies to `apiHost` and `trustedOrigins` only), `client` (the headless client for everything
else, such as OTP and magic link calls), and `ports`.

## Built-in screens

`@seamless-auth/angular/routes` exports `seamlessAuthRoutes` and the standalone components behind
them. Mount the routes wherever you like; the screens move between each other relative to their
parent route, so `{ path: 'account', children: seamlessAuthRoutes }` works too. There is no wildcard
route in the array, so mounting it at the root does not swallow your own unknown paths.

| Path               | Component           | Purpose                                                     |
| ------------------ | ------------------- | ----------------------------------------------------------- |
| `login`            | `SaLogin`           | Sign in with an email or phone number, or create an account |
| `passkey-login`    | `SaPasskeyLogin`    | Sign in with a passkey alone                                |
| `verify-email-otp` | `SaVerifyOtp`       | Check an email code (`data.channel: 'email'`)               |
| `verify-phone-otp` | `SaVerifyOtp`       | Check a text message code (`data.channel: 'phone'`)         |
| `magic-link-sent`  | `SaMagicLinkSent`   | Wait for an emailed link to be used                         |
| `verify-magiclink` | `SaVerifyMagicLink` | Where the emailed link lands. The auth API builds this URL  |
| `oauth/callback`   | `SaOAuthCallback`   | The OAuth redirect URI to register with providers           |
| `register-passkey` | `SaRegisterPasskey` | Offer passkey enrolment after sign-up                       |

The building blocks are exported too: `SaOtpInput` (bind with `[(value)]`), `SaFallbackOptions`,
`SaOAuthProviderButtons`, `SaAuthLayout`, `authRoutePaths`, and `injectAuthNavigation`.

Do not put `guestGuard` on `register-passkey`: a user who signed up has a session by the time it
renders, and the guard would send them on before they could add a passkey.

## Headless use

Every screen is a thin view over a flow in `@seamless-auth/client` (`beginSignIn`,
`registerWithEmail`, `verifyOtp`, `watchMagicLink`, `finishMagicLinkSignIn`, `startOAuthSignIn`,
`completeOAuthCallback`, `enrollPasskey`, and helpers). A custom screen calls the same flows with the
service as its actions:

```ts
import { beginSignIn } from '@seamless-auth/client';

const step = await beginSignIn(auth, {
  identifier: email,
  passkeySupported: await auth.checkPasskeySupport(),
  configuredMethods: await auth.loadLoginMethods(),
});

if (step.kind === 'signed_in') await router.navigateByUrl('/');
```

See the [client README](../client/README.md#flows) for the full list.

## Styling

The screens render inside `.sa-auth` with plain `.sa-*` classes and one unencapsulated stylesheet, so
an application's global styles can override any rule. Colours come from the same `--seamless-*`
custom properties the React screens read, so one theme covers both bindings:

```css
:root {
  --seamless-accent: #1f3a34;
  --seamless-accent-hover: #16302b;
  --seamless-surface: #f7f5f0;
  --seamless-surface-raised: #ffffff;
  --seamless-text: #1a1a1a;
  --seamless-text-muted: #4b5563;
}
```

| Token                                                                        | Used for                               |
| ---------------------------------------------------------------------------- | -------------------------------------- |
| `--seamless-accent`, `--seamless-accent-hover`, `--seamless-accent-contrast` | Primary buttons and focus rings        |
| `--seamless-accent-soft`                                                     | Links and toggle buttons               |
| `--seamless-surface`, `--seamless-surface-raised`                            | Cards, and inputs and panels on a card |
| `--seamless-border`                                                          | Input, button and panel borders        |
| `--seamless-text`, `--seamless-text-muted`                                   | Body and secondary text                |
| `--seamless-danger`, `--seamless-success`, `--seamless-warning`              | Errors, confirmations, code countdowns |
| `--seamless-shadow`                                                          | Card shadow colour                     |

The stylesheet also ships as `@seamless-auth/angular/seamless-auth.css` for an application that wants
to copy it as a starting point.

## Server rendering

On the server the service does not read the session or browser storage, and `loading` stays true
unless you pass `initialSession`. Resolve the session on your server with your adapter (for example
`getSeamlessUser` in `@seamless-auth/core`) and hand it over through `initialSession`; the browser then
revalidates it in the background. Never forward the browser's cookies to the adapter's
`/auth/users/me` from a server.

## License

Apache-2.0. See [LICENSE](./LICENSE).
