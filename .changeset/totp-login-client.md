---
'@seamless-auth/client': minor
---

Adds `verifyTotpLogin(code)`, which signs in with an authenticator app code on the sign-in `login()` started (`POST /totp/verify-login`). The bearer transport sends it on the pre-auth token and stores the session it issues.
