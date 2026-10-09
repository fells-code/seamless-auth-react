---
'@seamless-auth/svelte': minor
---

First release of `@seamless-auth/svelte`, the Svelte binding for Seamless Auth (Svelte 5).

- `createSeamlessAuth({ apiHost })` creates a session whose properties (`user`, `isAuthenticated`, `loading`, and the rest) are runes, with every auth action. `setSeamlessAuth` and `getSeamlessAuth` share it through context.
- `@seamless-auth/svelte/kit` provides `requireAuth(auth, { roles })` and `requireGuest(auth)` `load` guards, and `createKitNavigator` for the bundled screens, for SvelteKit 2.26 and later, and SvelteKit 3. Each guard waits for the session to be read.
- Sign-in screens (`SaLogin`, `SaVerifyOtp`, `SaMagicLinkSent`, `SaVerifyMagicLink`, `SaOAuthCallback`, `SaPasskeyLogin`, `SaRegisterPasskey`) to mount at your routes, themed with the same `--seamless-*` properties as the other bindings. They navigate through an `AuthNavigator`, so any router can drive them.

The binding uses cookie transport only: tokens stay in the server adapter, and nothing is written where page scripts can read it.
