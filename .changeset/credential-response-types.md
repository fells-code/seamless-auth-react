---
'@seamless-auth/react': patch
---

Correct the response types for credential and session endpoints, checked against the API's response schemas.

`updateCredential()` on `useAuth()` now returns the credential itself. It previously returned the `{ message, credential }` wrapper while declaring `Promise<Credential>`, so callers reading a field such as `friendlyName` got `undefined`, and the cast hid the mismatch from TypeScript.

Client return types corrected to match the server schemas:

- `updateCredential` returns `CredentialUpdateResult` (`{ message, credential }`), replacing `CredentialMutationResult`, which modelled `credential` as optional when the API always sends it
- `deleteCredential` returns `MessageResult`
- `logout`, `logoutAllSessions`, and `deleteUser` return `MessageResult` rather than being typed as returning no body

`CredentialMutationResult` is removed and replaced by `CredentialUpdateResult`.
