---
'@seamless-auth/react': minor
---

Normalize the bundled `AuthRoutes` paths to a consistent kebab-case set: `/passkey-login`, `/verify-phone-otp`, `/verify-email-otp`, `/verify-magic-link`, `/register-passkey`, and `/magic-link-sent`. `/login` and `/oauth/callback` are unchanged.

Every previous path still resolves. Each redirects to its canonical path and preserves query string, hash, and router state, so existing bookmarks and in-flight magic-link emails keep working. `/verify-magiclink` in particular is kept as a standing alias because the auth API builds that URL when sending magic-link emails.

Apps that link directly to the built-in screens should move to the canonical paths. Apps that only render `AuthRoutes` need no change.
