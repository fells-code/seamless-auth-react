---
'@seamless-auth/react': minor
---

Unify `useAuth()` on the same result convention as the headless client. Every provider helper now returns `SeamlessAuthResult` and none of them throw, so the whole SDK reports failure one way.

```tsx
const { error } = await updateCredential({ ...credential, friendlyName: 'Work laptop' });
if (error) {
  setMessage(error.message);
}
```

BREAKING: `useAuth()` previously mixed four styles. Seven helpers threw, four returned a result, `handlePasskeyLogin` returned a boolean, and `refreshStepUpStatus` returned `StepUpStatus | null`.

Migration:

- `deleteUser`, `updateCredential`, `deleteCredential`, `switchOrganization`, `listOAuthProviders`, `startOAuthLogin`, and `finishOAuthLogin` no longer throw. Replace `try`/`catch` with an `error` check.
- `handlePasskeyLogin` returns a result instead of a boolean. Replace `if (await handlePasskeyLogin())` with `if (!(await handlePasskeyLogin()).error)`.
- `refreshStepUpStatus` returns a result instead of `StepUpStatus | null`. Read `data` instead of the return value directly.
- `updateCredential` returns the credential under `data`.
- `logout`, `logoutAllSessions`, and `refreshSession` now return a result. Existing callers that ignore the return value keep working.

Helpers that mutate provider state still do so only when the call succeeds.
