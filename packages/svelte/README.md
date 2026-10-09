# @seamless-auth/svelte

[![npm version](https://img.shields.io/npm/v/@seamless-auth/svelte.svg?label=%40seamless-auth%2Fsvelte)](https://www.npmjs.com/package/@seamless-auth/svelte)
[![CI](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml/badge.svg)](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/fells-code/seamless-auth-react)](./LICENSE)

Svelte bindings for Seamless Auth: a rune-based session with every auth action, SvelteKit `load`
guards, and optional sign-in screens. It is a thin binding over
[`@seamless-auth/client`](../client/README.md), the same core the React, Angular, and Vue bindings
use, so the flows behave the same in all of them.

## Start here

New to Seamless Auth? The [self-hosted quickstart](https://docs.seamlessauth.com/start/quickstart/)
runs the full stack locally with Docker. The [compatibility matrix](https://docs.seamlessauth.com/build/ecosystem/#compatibility-matrix)
lists which package versions work together.

The browser talks only to your backend's `/auth` routes, served by a server adapter. The adapter keeps
the tokens; the browser holds only HttpOnly cookies. This package has no bearer mode and never writes
a token to `localStorage`, `sessionStorage`, or anywhere page scripts can read it.

## Requirements

- Svelte 5
- For the guards and the SvelteKit navigator in `@seamless-auth/svelte/kit`: SvelteKit 2.26 or later,
  or SvelteKit 3. The root entry works in any Svelte 5 application
- A Seamless Auth server adapter mounted at `/auth` on `apiHost`

## Installation

```bash
npm install @seamless-auth/svelte
```

## Quick start with SvelteKit

The examples import from `$lib`, as SvelteKit 2 does. In SvelteKit 3, which renamed it, import from
`#lib`.

Create the session once, in the browser:

```ts
// src/lib/auth.ts
import { createSeamlessAuth } from '@seamless-auth/svelte';

export const auth = createSeamlessAuth({ apiHost: 'https://app.example.com' });
```

The session lives in the browser, so render the application there. A backend-for-frontend app
usually ships as a single-page app (`adapter-static` with a fallback page):

```ts
// src/routes/+layout.ts
export const ssr = false;
```

Hand the session and a navigator to the components below the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { setAuthNavigator, setSeamlessAuth } from '@seamless-auth/svelte';
  import { createKitNavigator } from '@seamless-auth/svelte/kit';
  import { auth } from '$lib/auth';

  let { children } = $props();

  setSeamlessAuth(auth);
  setAuthNavigator(createKitNavigator(auth));
</script>

{@render children()}
```

Guard a route with a `load` function:

```ts
// src/routes/(app)/+layout.ts
import { requireAuth } from '@seamless-auth/svelte/kit';
import { auth } from '$lib/auth';

export const load = requireAuth(auth);
```

Mount each sign-in screen at its route:

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { SaLogin } from '@seamless-auth/svelte';
</script>

<SaLogin />
```

| Option                     | Default          | Purpose                                                     |
| -------------------------- | ---------------- | ----------------------------------------------------------- |
| `apiHost`                  | required         | Origin of the server adapter                                |
| `basePath`                 | `/auth`          | Where the adapter is mounted                                |
| `magicLinkRedirectUri`     | the deployment's | Where an emailed magic link lands                           |
| `autoDetectPreviousSignIn` | `true`           | Open the login screen on Sign In for a returning browser    |
| `initialSession`           | none             | A session the server already resolved                       |
| `ports`                    | browser          | `passkeys` and `oauthRedirect` ports                        |
| `fetch`                    | global `fetch`   | The fetch auth requests go through                          |
| `trustedOrigins`           | none             | Other origins of yours that may receive the session cookies |
| `injectStyles`             | `true`           | Whether the screens add their stylesheet to the page        |
| `cspNonce`                 | none             | A CSP nonce for that stylesheet                             |
| `signedInPath`             | `/`              | Where the bundled screens go after sign-in                  |
| `loginPath`                | `/login`         | Where `requireAuth` sends someone signed out                |

## Reading session state

Every property of the session is reactive, so read it straight in markup or an `$effect`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { getSeamlessAuth } from '@seamless-auth/svelte';

  const auth = getSeamlessAuth();

  async function signOut() {
    await auth.logout();
    await goto('/login');
  }
</script>

{#if auth.user}
  <span>{auth.user.email}</span>
  <button type="button" onclick={signOut}>Logout</button>
{/if}
```

Properties: `state`, `user`, `isAuthenticated`, `loading`, `credentials`, `organizations`,
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
(the headless client for everything else, such as OTP and magic link calls), `ports`, and
`destroy()`.

## Guards

`@seamless-auth/svelte/kit` exports `load` functions. They wait for the session to be read before
deciding, so reloading a protected page does not bounce a signed-in user to the login screen.

| Guard                          | Admits                                    | Otherwise                                                                                                             |
| ------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `requireAuth(auth, options?)`  | A signed-in user, with `roles` when given | Redirects to `redirectTo` (default `loginPath`), or `forbiddenRedirectTo` (default `signedInPath`) for a missing role |
| `requireGuest(auth, options?)` | Someone signed out                        | Redirects to `redirectTo` (default `signedInPath`)                                                                    |

The guards register a dependency on the session and on the URL, so they run again on every
navigation and whenever the session changes (a sign-out in another tab, an expired session, a
switched organization), as long as the navigator from `createKitNavigator` is set in the root layout.
A server render that was not handed an `initialSession` cannot see the session, so `requireAuth`
treats it as signed out and redirects. Turn server rendering off for guarded routes
(`export const ssr = false`). `roles` uses the same matching as
the auth API, scoped roles such as `org:admin` included. A guard is a convenience for navigation, not
access control: your server still checks every request.

Put `requireGuest` only on the screens that start a sign-in (`login`, `passkey-login`,
`magic-link-sent`). A user can already have a session when `register-passkey`, `oauth/callback`, or
`verify-magiclink` renders.

## Built-in screens

Mount each at its route. The paths below are what the screens navigate between by default; pass
`paths` to `createKitNavigator` if you mount them elsewhere.

| Default path        | Component                     | Purpose                                                     |
| ------------------- | ----------------------------- | ----------------------------------------------------------- |
| `/login`            | `SaLogin`                     | Sign in with an email or phone number, or create an account |
| `/passkey-login`    | `SaPasskeyLogin`              | Sign in with a passkey alone                                |
| `/verify-email-otp` | `SaVerifyOtp channel="email"` | Check an email code                                         |
| `/verify-phone-otp` | `SaVerifyOtp channel="phone"` | Check a text message code                                   |
| `/magic-link-sent`  | `SaMagicLinkSent`             | Wait for an emailed link to be used                         |
| `/verify-magiclink` | `SaVerifyMagicLink`           | Where the emailed link lands. The auth API builds this URL  |
| `/oauth/callback`   | `SaOAuthCallback`             | The OAuth redirect URI to register with providers           |
| `/register-passkey` | `SaRegisterPasskey`           | Offer passkey enrolment after sign-up                       |

The building blocks are exported too: `SaOtpInput` (bind with `bind:value`), `SaFallbackOptions`,
`SaOAuthProviderButtons`, `SaAuthLayout`, and `authRoutePaths`.

The magic link and OAuth callback screens remove the token or code from the URL once they have read
it. Serve those routes with `Referrer-Policy: no-referrer` (or `same-origin`) so a single-use secret
does not leave in a `Referer` before then.

### Without SvelteKit

The screens never import a router. They navigate through an `AuthNavigator` set with
`setAuthNavigator`, so any router can drive them: implement its seven methods (`toScreen`, `toApp`,
`toLocation`, `state`, `query`, `dropQuery`, `absoluteUrl`) on top of your router.
`createKitNavigator` is the SvelteKit one.

## Headless use

Every screen is a thin view over a flow in `@seamless-auth/client` (`beginSignIn`,
`registerWithEmail`, `verifyOtp`, `watchMagicLink`, `finishMagicLinkSignIn`, `startOAuthSignIn`,
`completeOAuthCallback`, `enrollPasskey`, and helpers). A custom screen calls the same flows with the
session as its actions:

```ts
import { beginSignIn } from '@seamless-auth/client';

const step = await beginSignIn(auth, {
  identifier: email,
  passkeySupported: await auth.checkPasskeySupport(),
  configuredMethods: await auth.loadLoginMethods(),
});

if (step.kind === 'signed_in') await goto('/');
```

See the [client README](../client/README.md#flows) for the full list.

## Styling

The screens render inside `.sa-auth` with plain `.sa-*` classes. The first screen to mount adds the
stylesheet to the top of `<head>`, so your own styles override it. Colours come from the same
`--seamless-*` custom properties the React, Angular, and Vue screens read, so one theme covers every
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

Under a Content Security Policy, pass `cspNonce`, or set `injectStyles: false` and link
`@seamless-auth/svelte/seamless-auth.css` yourself.

## Server rendering

The session is meant for the browser. On a server it does not read the session or browser storage,
the screens start no requests, and `requireAuth` redirects. If you do render on a server, create the
session per request (never in a module shared between requests) and pass `initialSession` from your
adapter. Never forward the browser's cookies to the adapter's `/auth/users/me` from a server.

## License

Apache-2.0. See [LICENSE](./LICENSE).
