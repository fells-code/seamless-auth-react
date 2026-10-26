---
'@seamless-auth/client': minor
'@seamless-auth/react-native': minor
---

Add the auth API v0.20 recovery primitives to the client and the session store.

- Recovery codes: `getRecoveryCodeStatus()`, `generateRecoveryCodes()` and `redeemRecoveryCode(code)`. Replacing an existing set needs a fresh step-up; the `403` it answers without one is recognized by `isStepUpRequired()`, and `generateRecoveryCodesWithStepUp()` runs the step-up and tries again.
- Self-service account recovery: `startAccountRecovery(channel)`, `verifyAccountRecovery(code)`, `getAccountRecoveryStatus()`, `completeAccountRecovery()`, `cancelAccountRecovery(cancelToken)`, and for a signed-in owner `listAccountRecoveryRequests()` and `cancelAccountRecoveryRequest(id)`.
- Recovery sessions: redeeming a code or completing a recovery issues a session that can only enroll a factor. `isRecoverySession()` on the client and `recoverySession` in the session state report it, and the session actions `redeemRecoveryCode` and `completeAccountRecovery` sign in with it. After a passkey registration or TOTP enrollment made from a recovery session the client refreshes the session (`POST /refresh`), so the new access token drops the recovery claim the adapters' guards refuse.
- Flows for every binding: `loadRecoveryOptions()`, `recoveryCancelTokenFromHash()`, `cancelRecoveryFromLink()`, `recoveryErrorMessage()`, `recoveryCodesText()`, `passkeyKind()` and `passkeyDisplayName()`, plus `getRecoveryErrorCode()` and `isEnrollmentRequired()`.
- Bearer transport routes each recovery route with the credential the auth API's adapter manifest gives it.

Needs an auth API with account recovery (v0.20) and a server adapter that proxies its manifest routes.
