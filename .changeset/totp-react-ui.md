---
'@seamless-auth/react': minor
---

The prebuilt UI covers authenticator apps (TOTP).

- `AuthenticatorRegistration` at `/register-authenticator` sets up an authenticator app: a QR code of the `otpauth://` URL (drawn as an inline SVG, no new dependency), the setup key in groups of four with a copy button, an `otpauth://` link for a phone, and the first code. It then continues to `/recovery-codes` as passkey enrollment does.
- `/authenticator-code` signs in with a code from the app, on the sign-in `/login` started. The sign-in screen offers "Use an authenticator app" on every sign-in in progress, because `/login` never lists `totp` and the API answers the code step the same for an address with no account. Wrong or reused codes, lockouts, rate limits and passkey-only accounts each get their own message.
- A recovery session's passkey step offers "Use an authenticator app", which is the way forward on a device without passkeys. Verifying the first code lifts the recovery restriction, and the session is refreshed before the screen moves on.
- Replacing recovery codes, in `RecoveryCodeSettings` and on `/recovery-codes`, asks for a current code from the authenticator app when the API wants a step-up and the account has one, with the passkey as an alternative.
- New router-free settings section `AuthenticatorAppSettings` (status, inline enrollment, turn off with a current code), which `AccountSecurity` now renders between passkeys and recovery codes.
- The package re-exports `signInWithTotp`, `totpErrorMessage`, `formatTotpSecret`, `qrCode`, `TOTP_CODE_LENGTH` and the `QrCode` type for custom screens.

Needs an auth API with `POST /totp/verify-login` and a server adapter that proxies it.
