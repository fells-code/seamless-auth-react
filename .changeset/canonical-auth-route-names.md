---
'@seamless-auth/react': minor
---

Rename the bundled `AuthRoutes` paths to a consistent kebab-case set. The previous mixed-case paths are no longer served.

| Old path           | New path            |
| ------------------ | ------------------- |
| `/passKeyLogin`    | `/passkey-login`    |
| `/verifyPhoneOTP`  | `/verify-phone-otp` |
| `/verifyEmailOTP`  | `/verify-email-otp` |
| `/registerPasskey` | `/register-passkey` |
| `/magiclinks-sent` | `/magic-link-sent`  |

BREAKING: anything linking directly to an old path now falls through to `/login`. Apps that only render `AuthRoutes` and rely on its internal navigation need no change.

`/login`, `/verify-magiclink`, and `/oauth/callback` are unchanged. The latter two are fixed by contracts outside this package: the auth API builds the magic-link URL when it sends the email, and the OAuth callback is registered with providers as an allowed redirect URI.
