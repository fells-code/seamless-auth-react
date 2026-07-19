---
'@seamless-auth/react': patch
---

Make the platform authenticator capability check safe to evaluate in a server environment. `isPlatformAuthenticatorAvailable` previously read `window` without a guard and threw a `ReferenceError` during server-side rendering. It now returns `false` when there is no `window`, matching the guard already used by the WebAuthn availability check.
