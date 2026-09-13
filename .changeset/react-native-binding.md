---
'@seamless-auth/react-native': minor
---

First release of `@seamless-auth/react-native`, the headless React Native binding.

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
