---
'@seamless-auth/svelte': minor
---

The bundled screens cover authenticator apps (TOTP).

- `SaRegisterAuthenticator` (`/register-authenticator`) adds an authenticator app: a QR code drawn in the page with no extra dependency, the setup key with a copy button and an `otpauth://` link, and the first code to confirm it. It ends on a success state, then continues where passkey enrolment does.
- `SaAuthenticatorCode` (`/authenticator-code`) signs in with a code from the app, and explains a wrong or reused code, a lockout and a rate limit.
- `SaLogin` offers "Use an authenticator app" with the other sign-in options. `SaRegisterPasskey` offers it when the device cannot register a passkey, and always to a recovery session, which can no longer skip enrolment. Enrolling an authenticator app lifts the recovery restriction.
- `SaAuthenticatorAppSettings` is a router-free settings section: status, set up, and turn off with a current code.
- `authRoutePaths` gains `registerAuthenticator` and `authenticatorCode`, and the package re-exports the `TotpStatus` type.

Mount the two new screens at their paths (or pass `paths` to `createKitNavigator`). Needs a server adapter that proxies the auth API's `/totp/*` routes.
