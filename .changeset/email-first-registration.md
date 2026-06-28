---
"@seamless-auth/react": patch
---

Register with just an email. The registration form no longer requires a phone
number (it stays optional, validated only when provided), and a successful
registration now routes to email verification (`/verifyEmailOTP`) instead of
phone verification — matching the auth server's email-first registration. After
verifying the email code the user is signed in.
