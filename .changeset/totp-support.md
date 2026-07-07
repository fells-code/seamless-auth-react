---
'@seamless-auth/react': minor
---

Add TOTP (authenticator app) support. The headless client gains
`getTotpStatus()`, `startTotpEnrollment()`, `verifyTotpEnrollment(code)`, and
`disableTotp(code)` for enrollment and management, plus
`verifyStepUpWithTotp(code)` for TOTP-based step-up verification.
`AuthProvider`/`useAuth()` expose `verifyStepUpWithTotp(code)`, which refreshes
`stepUpStatus` on success alongside the existing passkey step-up helpers. The
`StepUpMethod` type now includes `'totp'`, and `TotpStatus` and
`TotpEnrollmentStartResult` are exported.

TOTP applies to step-up verification, not to the login flow: the auth API issues
a full session on the first factor and does not gate login on TOTP.

Requires an auth backend that exposes the `/totp/*` routes (available in
`@seamless-auth/express` 0.6+).
