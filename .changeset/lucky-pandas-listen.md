---
'@seamless-auth/react': minor
---

Stop discarding the underlying WebAuthn error. The passkey login, passkey registration, and step-up verification methods now attach the thrown ceremony error to the returned `SeamlessAuthError` as `cause`, and a new `getWebAuthnErrorDetail()` export reads its `name`, `code`, and `message`. Callers can tell a dismissed prompt or missing credential (`NotAllowedError`) apart from an origin or RP ID mismatch (`SecurityError`) instead of seeing one generic string. The friendly result messages are unchanged, and only the error name is logged.
