---
'@seamless-auth/react': minor
---

Remove the unused `mfaRequired` field from `PasskeyLoginResult` (and the inherited `PasskeyLoginWithPrfResult`). The backend never gated passkey login on a second factor, so the field was always `false` and the related fail-closed path in `handlePasskeyLogin` was dead code.

BREAKING: consumers reading `result.mfaRequired` from `loginWithPasskey()` should remove that check. A successful passkey login is now indicated solely by `result.success`.
