---
'@seamless-auth/react': patch
---

Fix a passwordless copy slip in the built-in Login view, which previously
suggested resetting a password on an unexpected error (there are no passwords in
this system).

Docs: correct the OAuth callback example to read the provider from
sessionStorage (matching the bundled flow) instead of hardcoding a provider,
list the `/oauth/callback` built-in route, and complete the backend endpoint
expectations (login OTP variants and organization routes).
