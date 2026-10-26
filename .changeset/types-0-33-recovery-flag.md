---
'@seamless-auth/client': patch
'@seamless-auth/react': patch
'@seamless-auth/react-native': patch
---

Update `@seamless-auth/types` to 0.33.0. `AccountRecoveryRequest`, `AccountRecoveryRequestsResult` and `RecoveryErrorCode` now alias the upstream shapes, and `RecoveryErrorCode` gains `enrollment_required`.

The recovery session flag is now read from the `recovery` field of `/users/me` as well, so `isRecoverySession()` and the session state's `recoverySession` survive a reload, a background revalidation and `initialSession`. A restored recovery session is sent to enrollment by the bundled sign-in screen, and the session is refreshed after a passkey or TOTP enrollment made from it.
