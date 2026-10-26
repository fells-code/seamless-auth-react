---
'@seamless-auth/client': minor
---

Adds shared authenticator app (TOTP) flow helpers for the bundled screens: `signInWithTotp()`, `totpErrorMessage()`, `formatTotpSecret()` and `TOTP_CODE_LENGTH`.

The bearer transport no longer refreshes and resends a request whose `401` names a rejected factor (`totp_verification_failed`, `totp_disable_failed`, `step_up_failed`, `invalid_recovery_code`). That `401` is the answer to a wrong code, not an expired token, and resending the same code only spent another attempt against the rate limit and lockout.

`generateRecoveryCodesWithStepUp()` now reports a failed step-up as "Confirm it is you to replace your recovery codes." instead of naming the passkey, since the step-up can also be an authenticator app code.
