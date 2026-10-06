# @seamless-auth/react-native

## 0.2.0

### Minor Changes

- 0fcd830: Relicense from AGPL-3.0-only to the Apache License, Version 2.0 (fells-code/seamless-auth-api#335). The `LICENSE` file, the `license` field and the license header in source files now say Apache-2.0, and the AGPL summary in `LICENSE.md` is removed.

### Patch Changes

- 7a26a6c: Depend on `@seamless-auth/types` `^0.26.0` (was `^0.25.0`), so the SDK's wire types track the current auth API contract.
- Updated dependencies [0fcd830]
- Updated dependencies [7a26a6c]
  - @seamless-auth/client@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [419025e]
- Updated dependencies [0dfe622]
  - @seamless-auth/client@0.2.0

## 0.1.0

### Minor Changes

- 280ceee: First release of `@seamless-auth/react-native`, the headless React Native binding.

  An `AuthProvider` over the shared session store, always on bearer transport; `useAuth`,
  `useAuthClient`, `useLoginMethods` and `usePasskeySupport`; and the native ports:
  `createSecureStoreTokenStorage` (expo-secure-store), `createNativePasskeyPort`
  (react-native-passkeys, mapping native failures onto the DOMException names the client's error
  readers understand), `createWebBrowserOAuthRedirect` (expo-web-browser auth session, resolving the
  callback's `code` and `state`), and `describeDevice` for passkey metadata. Each port takes its
  native module as a parameter, so an app installs only what it uses and Metro never resolves a
  module it did not.

  No screens: the app brings its own, the same way a web app that skips `AuthRoutes` does. The flows,
  session state, and token custody come from `@seamless-auth/client`.

### Patch Changes

- Updated dependencies [93a35b7]
- Updated dependencies [f8f0dfe]
  - @seamless-auth/client@0.1.0
