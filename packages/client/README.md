# @seamless-auth/client

The framework-agnostic core of the Seamless Auth client SDKs. It holds the
headless auth client (`createSeamlessAuthClient`), the session store
(`createAuthSession`), and the result and error types that every binding shares.
`@seamless-auth/react` is a thin binding over this package, and it is the
package a React Native or other non-React binding builds on.

If you are building a React application, install
[`@seamless-auth/react`](https://www.npmjs.com/package/@seamless-auth/react)
instead; it depends on this package and re-exports what an application needs.

## Install

```bash
npm install @seamless-auth/client
```

## What is here

- `createSeamlessAuthClient({ apiHost })`: the request choreography for login,
  registration, OTP, magic link, passkey, OAuth, step-up, TOTP, credential and
  organization flows against a Seamless Auth server adapter mounted at `/auth`.
  Every method returns a `SeamlessAuthResult<T>`.
- `createAuthSession({ apiHost, storage?, detectPreviousSignIn? })`: the session
  state machine (`getState`, `subscribe`, `actions`, `destroy`), designed to be
  bound with `useSyncExternalStore` or an equivalent.
- `SessionStoragePort` with browser and memory implementations.
- `SeamlessAuthError`, `getWebAuthnErrorDetail`, `getOAuthErrorCode`,
  `isUnauthenticated`, and the other error readers.
- PRF helpers for passkey-derived secrets.
- `hasScopedRole` / `roleGrantsAccess`, the same role matching the auth API and
  server adapters apply.

The wire types come from `@seamless-auth/types`; this package aliases them rather
than redeclaring shapes.

## Transport

Today the client speaks the cookie contract: requests go to `${apiHost}/auth/*`
with `credentials: 'include'` and the server adapter holds the tokens. A bearer
transport for native clients is the next change to this package.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
