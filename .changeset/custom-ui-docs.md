---
'@seamless-auth/react': patch
---

Expand the custom UI documentation with worked examples for registration, OTP and magic-link continuation, and credential management. The OTP and magic-link section documents that `requestMagicLink()`, `requestLoginEmailOtp()`, and `requestLoginPhoneOtp()` take no identifier and depend on server-side state from a preceding `login()` call, which is not evident from their signatures.

Also corrects README references left stale by the result-object change: the `useAuth()` signature block, the step-up examples that used `result.success`, and the PRF example that read `result.prf`.
