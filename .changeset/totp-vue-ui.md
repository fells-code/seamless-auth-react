---
'@seamless-auth/vue': minor
---

The bundled screens support authenticator apps (TOTP).

- `createSeamlessAuthRoutes()` adds `register-authenticator` (`SaRegisterAuthenticator`), which shows a QR code, the setup key with a copy button and an `otpauth://` link, verifies the first code and then continues where passkey enrolment does, and `authenticator-code` (`SaAuthenticatorCode`), which finishes a sign-in with a code from the app. Wrong or reused codes, lockout and rate limits each get a clear message.
- The sign-in screen's fallback options always include "Use an authenticator app" once a sign-in has started. The API answers a code for any account, so this reveals nothing about the account.
- `SaRegisterPasskey` offers "Use an authenticator app" on a device that cannot register a passkey (unless the application signs in with passkeys only, where the API would refuse the app), and always for a recovery session, which can no longer skip enrolment. Adding the app ends the recovery restriction.
- `SaAuthenticatorAppSettings`, exported from the package root and router-free, shows whether an authenticator app is set up and lets the user add one or turn it off with a current code.
- `useSeamlessAuth()` adds `recoverySession`, and the package re-exports the `TotpStatus` type.

Needs an auth API with TOTP sign-in (`POST /totp/verify-login`) and a server adapter that proxies the `/totp` routes.
