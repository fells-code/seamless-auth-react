# @seamless-auth/vue

[![npm version](https://img.shields.io/npm/v/@seamless-auth/vue.svg?label=%40seamless-auth%2Fvue)](https://www.npmjs.com/package/@seamless-auth/vue)
[![CI](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml/badge.svg)](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/fells-code/seamless-auth-react)](./LICENSE)

Vue bindings for Seamless Auth: a plugin and a `useSeamlessAuth()` composable for session state and
auth actions, `vue-router` guards, and optional sign-in screens. It is a thin binding over
[`@seamless-auth/client`](../client/README.md), the same core the React and Angular bindings use, so
the flows behave the same in all of them.

## Start here

New to Seamless Auth? The [self-hosted quickstart](https://docs.seamlessauth.com/start/quickstart/)
runs the full stack locally with Docker. The [compatibility matrix](https://docs.seamlessauth.com/build/ecosystem/#compatibility-matrix)
lists which package versions work together.

The browser talks only to your backend's `/auth` routes, served by a server adapter. The adapter keeps
the tokens; the browser holds only HttpOnly cookies. This package has no bearer mode and never writes
a token to `localStorage`, `sessionStorage`, or anywhere page scripts can read it.

## Requirements

- Vue 3.5 or later
- `vue-router` 4.4 or later (including 5) for the guards and screens in `@seamless-auth/vue/router`.
  The root entry does not need it
- A Seamless Auth server adapter mounted at `/auth` on `apiHost`

## Installation

```bash
npm install @seamless-auth/vue
```

## Quick start

```ts
// main.ts
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createSeamlessAuth } from '@seamless-auth/vue';
import {
  authGuard,
  createSeamlessAuthRoutes,
  guestGuard,
} from '@seamless-auth/vue/router';

import App from './App.vue';
import HomePage from './HomePage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage, beforeEnter: authGuard },
    ...createSeamlessAuthRoutes(),
  ],
});

createApp(App)
  .use(router)
  .use(createSeamlessAuth({ apiHost: 'https://app.example.com' }))
  .mount('#app');
```

Each application the plugin is installed in gets its own session, so a server rendering many requests
never shares one. The session is read as soon as the application starts in the browser.

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
| `injectStyles`             | `true`           | Whether the screens add their stylesheet to the page        |
| `cspNonce`                 | none             | A CSP nonce for that stylesheet                             |
| `signedInPath`             | `/`              | Where the bundled screens go after sign-in                  |
| `loginPath`                | `/login`         | Where `requireAuth` sends someone signed out                |

### Read session state

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useSeamlessAuth } from '@seamless-auth/vue';

const auth = useSeamlessAuth();
const router = useRouter();

async function signOut() {
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <span v-if="auth.user.value">{{ auth.user.value.email }}</span>
  <button v-if="auth.isAuthenticated.value" type="button" @click="signOut">Logout</button>
</template>
```

## `useSeamlessAuth()` API

Read-only refs: `state`, `user`, `isAuthenticated`, `loading`, `credentials`, `organizations`,
`activeOrganization`, `stepUpStatus`, `hasSignedInBefore`, plus `loginMethods`,
`loginMethodsLoading`, `passkeySupported`, and `passkeySupportLoading`.

Actions, each resolving to a `SeamlessAuthResult<T>` (`{ data, error }`) that never throws for an HTTP
failure: `login`, `handlePasskeyLogin`, `registerPasskey`, `refreshSession`, `logout`,
`logoutAllSessions`, `deleteUser`, `updateCredential`, `deleteCredential`, `switchOrganization`,
`listOAuthProviders`, `startOAuthLogin`, `finishOAuthLogin`, `refreshStepUpStatus`,
`verifyStepUpWithPasskey`, `verifyStepUpWithPasskeyPrf`, `verifyStepUpWithTotp`.

Also: `hasRole`, `hasScopedRole`, `markSignedIn`, `whenSettled()` (resolves once the session is read),
`loadLoginMethods()` and `checkPasskeySupport()` (each read once and cached), `authorizedFetch` (a
fetch for your own API that carries the cookies to `apiHost` and `trustedOrigins` only), `client`
(the headless client for everything else, such as OTP and magic link calls), and `ports`.

## Guards

`@seamless-auth/vue/router` exports guards for `beforeEnter` or `router.beforeEach`. They wait for the
session to be read before deciding, so reloading a protected page does not bounce a signed-in user to
the login screen.

| Guard                                   | Admits                                    | Otherwise                                                                                   |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `authGuard` / `requireAuth(options?)`   | A signed-in user, with `roles` when given | `redirectTo` (default `loginPath`); `forbiddenRedirectTo` or refusal when a role is missing |
| `guestGuard` / `requireGuest(options?)` | Someone signed out                        | `redirectTo` (default `signedInPath`)                                                       |

`roles` uses the same matching as the auth API, scoped roles such as `org:admin` included. A guard is
a convenience for navigation, not access control: your server still checks every request.

## Built-in screens

`createSeamlessAuthRoutes({ basePath? })` returns the screens as named routes (`seamless-auth-login`
and so on) to spread into your router. They reach each other by name, so any `basePath` works. There
is no catch-all among them, so they never swallow your own unknown paths.

| Path               | Component           | Purpose                                                     |
| ------------------ | ------------------- | ----------------------------------------------------------- |
| `login`            | `SaLogin`           | Sign in with an email or phone number, or create an account |
| `passkey-login`    | `SaPasskeyLogin`    | Sign in with a passkey alone                                |
| `verify-email-otp` | `SaVerifyOtp`       | Check an email code                                         |
| `verify-phone-otp` | `SaVerifyOtp`       | Check a text message code                                   |
| `magic-link-sent`  | `SaMagicLinkSent`   | Wait for an emailed link to be used                         |
| `verify-magiclink` | `SaVerifyMagicLink` | Where the emailed link lands. The auth API builds this URL  |
| `oauth/callback`   | `SaOAuthCallback`   | The OAuth redirect URI to register with providers           |
| `register-passkey` | `SaRegisterPasskey` | Offer passkey enrolment after sign-up                       |

The building blocks are exported too: `SaOtpInput` (bind with `v-model`), `SaFallbackOptions`,
`SaOAuthProviderButtons`, `SaAuthLayout`, `authRoutePaths`, `authRouteName`, and
`useAuthNavigation`.

Put `guestGuard` only on the screens that start a sign-in (`login`, `passkey-login`,
`magic-link-sent`). A user can already have a session when `register-passkey`, `oauth/callback`, or
`verify-magiclink` renders, and the guard would send them on before they finish.

The magic link and OAuth callback screens remove the token or code from the URL once they have read
it, so a single-use secret does not stay in history or travel in a `Referer`.

## Headless use

Every screen is a thin view over a flow in `@seamless-auth/client` (`beginSignIn`,
`registerWithEmail`, `verifyOtp`, `watchMagicLink`, `finishMagicLinkSignIn`, `startOAuthSignIn`,
`completeOAuthCallback`, `enrollPasskey`, and helpers). A custom screen calls the same flows with the
session as its actions:

```ts
import { beginSignIn } from '@seamless-auth/client';

const step = await beginSignIn(auth, {
  identifier: email.value,
  passkeySupported: await auth.checkPasskeySupport(),
  configuredMethods: await auth.loadLoginMethods(),
});

if (step.kind === 'signed_in') await router.push('/');
```

See the [client README](../client/README.md#flows) for the full list.

## Styling

The screens render inside `.sa-auth` with plain `.sa-*` classes. The first screen to mount adds the
stylesheet to the top of `<head>`, so your own styles override it. Colours come from the same
`--seamless-*` custom properties the React and Angular screens read, so one theme covers every
binding:

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

The stylesheet also ships as `@seamless-auth/vue/seamless-auth.css`. Link it yourself when you render
on the server, so the first paint is already styled. Under a Content Security Policy, pass
`cspNonce` so the injected `<style>` carries your nonce, or set `injectStyles: false` and link the
file instead.

## Server rendering

On the server the session is not read and no screen starts a request: a server render has none of the
browser's cookies, and a magic link or OAuth code is single use. `loading` stays true unless you pass
`initialSession`. Without it, `requireAuth` treats the request as signed out and redirects to
`loginPath`, so a protected page's data never renders into a response for someone the server could not
identify; the browser decides again when the application boots. Resolve the session on your server
through your adapter and hand it over as `initialSession`, building the plugin's config per request so
one visitor's session is never another's. The browser then revalidates it in the background. Never
forward the browser's cookies to the adapter's `/auth/users/me` from a server.

The magic link and OAuth callback URLs carry a single-use secret until the screen drops it. Serve
those routes with `Referrer-Policy: no-referrer` (or `same-origin`) so it does not leave in a
`Referer` before then.

## License

Apache-2.0. See [LICENSE](./LICENSE).
