---
'@seamless-auth/client': minor
'@seamless-auth/react': patch
'@seamless-auth/react-native': patch
---

`@seamless-auth/client` now exports the step logic behind the bundled sign-in screens: `beginSignIn`, `registerWithEmail`, `requestOtp` and `verifyOtp`, `watchMagicLink` and `finishMagicLinkSignIn`, `startOAuthSignIn` and `completeOAuthCallback`, `enrollPasskey`, `loadLoginMethods`, `fallbackSignInOptions`, `detectPasskeySupport`, `safeReturnPath` and `inAppPath`, plus `isValidEmail`, `isValidPhoneNumber` and `parseUserAgent`. A custom UI in any framework can call them, and every binding's screens now share one implementation. The React and React Native screens behave as before.
