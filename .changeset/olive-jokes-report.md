---
'@seamless-auth/react': minor
---

Surface OAuth callback error codes. A new `getOAuthErrorCode()` export reads the auth API's machine-readable `code` off a `SeamlessAuthError` and narrows it to `oauth_missing_email`, `oauth_email_not_verified`, or `oauth_missing_subject`, returning `undefined` for anything unrecognized. The bundled OAuth callback screen now maps those three codes to actionable text instead of one generic failure message.
