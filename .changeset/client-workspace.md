---
'@seamless-auth/client': minor
'@seamless-auth/react': patch
---

Split the framework-agnostic core into `@seamless-auth/client`, and make this repository an npm workspace that publishes both packages.

`@seamless-auth/react` was one package holding two layers: the headless client, session store, and result types that any binding needs, and the React provider, hooks, and screens on top. A React Native binding is next, and it must share the first layer rather than copy it, since the session state machine is the worst place for two implementations to drift (#64).

`@seamless-auth/client` now carries `createSeamlessAuthClient`, `createAuthSession`, `SessionStoragePort` and its implementations, `createFetchWithAuth`, the error and result types, the PRF helpers, role matching, and the wire type aliases. `@seamless-auth/react` depends on it and re-exports the same public surface it did before, so an application installing `@seamless-auth/react` sees no change in what it imports or how it behaves.

Packaging only: no runtime behaviour changes in either package.
