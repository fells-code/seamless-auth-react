---
'@seamless-auth/react': minor
---

The prebuilt UI covers account recovery from auth API v0.20.

- `AuthRoutes` serves `/recovery-code` (sign in with a recovery code), `/recovery-codes` (shown after a passkey is enrolled, to generate and save a first set, or a new one once every code is spent), `/account-recovery` (self-service recovery through a verified email or phone, with its waiting period) and `/recovery/cancel`, where the link in every recovery notice lands. That page takes the token from the URL fragment, drops it from the address bar and cancels the request. Mount `AuthRoutes` at the root of the deployment's `FRONTEND_URL` so the link resolves.
- The sign-in screen offers "Use a recovery code" and "Recover your account" only where `GET /system-config/public` reports `recoveryCodes` or `accountRecovery`. A recovery session goes straight to passkey enrollment, which it cannot skip.
- New router-free settings sections: `PasskeyManagement` (list with name, kind and last use, rename, delete, add another, and a nudge towards a second passkey), `RecoveryCodeSettings` (codes left, generate or replace with a step-up), `RecoveryRequests` (open recovery requests with cancel), and `AccountSecurity`, which renders all three.
- `useAuth()` adds `recoverySession`, `redeemRecoveryCode` and `completeAccountRecovery`, and the package re-exports `useRecoveryOptions`, `isStepUpRequired`, `isEnrollmentRequired`, `getRecoveryErrorCode` and the recovery types.

Needs an auth API with account recovery (v0.20) and a server adapter that proxies its manifest routes, including `POST /auth/refresh`.
