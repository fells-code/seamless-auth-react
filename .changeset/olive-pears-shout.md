---
'@seamless-auth/react': minor
---

Add `getPasskeyPolicyErrorCode()`, which reads the code a refused passkey
registration carries (`attachment_not_allowed`, `synced_passkey_not_allowed`,
`authenticator_not_allowed`, or `prf_required`) so an app can explain the
refusal instead of rendering the raw code from `error.message`. Unrecognized
codes return `undefined`, so a refusal from a newer API keeps your generic
messaging.

The `PasskeyPolicyErrorCode` union is derived from `WebAuthnErrorCode` in
`@seamless-auth/types`, so the codes this recognizes cannot drift from the ones
the API sends.

This matters on a default deployment: the API's
`authenticator_policy.syncedPasskeys` defaults to `block`, and passkeys created
by iCloud Keychain or Google Password Manager are backup eligible, so the most
common consumer passkey is refused at registration.
