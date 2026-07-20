---
'@seamless-auth/react': minor
---

Standardize the headless client on a single result convention. Every request method now resolves to a `SeamlessAuthResult<T>`:

```ts
const { data, error } = await authClient.getCurrentUser();
if (error) {
  setMessage(error.message);
  return;
}
setUser(data.user);
```

BREAKING: the client previously mixed three conventions. Most methods returned a raw `Response`, a few returned a result object with a `success` flag, and `listOAuthProviders` and `startOAuthLogin` threw a generic `Error` that discarded the server's detail. All of them now return `{ data, error }`.

What this changes for callers:

- Methods that returned `Response`: replace `response.ok` and `await response.json()` with `error` and `data`. The response body is now parsed and typed, so `CurrentUserResult`, `LoginStartResult`, `OrganizationsResult`, `TotpStatus`, and friends are real return types instead of types you cast to by hand.
- `loginWithPasskey`, `registerPasskey`, and the step-up verifiers: replace `result.success` with `!result.error`. Their payloads moved to `data`, so `result.prf` becomes `result.data.prf`, and `result.credentialId` becomes `result.data.credentialId`.
- `listOAuthProviders` and `startOAuthLogin`: these no longer throw. Check `error` instead of wrapping the call in `try`/`catch`.
- Removed types: `PasskeyLoginResult`, `PasskeyLoginWithPrfResult`, `PasskeyRegistrationResult`, `StepUpVerificationResult`, and `StepUpWithPasskeyPrfResult`. Replaced by `PasskeyLoginData`, `PasskeyRegistrationData`, `StepUpPrfData`, and the shared `SeamlessAuthResult`.

Failures no longer throw for HTTP or transport errors, so an expected auth outcome such as a wrong code or an expired link is a value rather than an exception. `SeamlessAuthError` carries the server `message`, HTTP `status`, and parsed `body`, and a transport failure is reported with `status` `0`.
