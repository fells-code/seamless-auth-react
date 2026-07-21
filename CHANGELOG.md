# @seamless-auth/react

## 0.5.0

### Minor Changes

- e591d09: Rename the bundled `AuthRoutes` paths to a consistent kebab-case set. The previous mixed-case paths are no longer served.

  | Old path           | New path            |
  | ------------------ | ------------------- |
  | `/passKeyLogin`    | `/passkey-login`    |
  | `/verifyPhoneOTP`  | `/verify-phone-otp` |
  | `/verifyEmailOTP`  | `/verify-email-otp` |
  | `/registerPasskey` | `/register-passkey` |
  | `/magiclinks-sent` | `/magic-link-sent`  |

  BREAKING: anything linking directly to an old path now falls through to `/login`. Apps that only render `AuthRoutes` and rely on its internal navigation need no change.

  `/login`, `/verify-magiclink`, and `/oauth/callback` are unchanged. The latter two are fixed by contracts outside this package: the auth API builds the magic-link URL when it sends the email, and the OAuth callback is registered with providers as an allowed redirect URI.

- 7931828: Standardize the headless client on a single result convention. Every request method now resolves to a `SeamlessAuthResult<T>`:

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

- 02c99f3: Request magic links over `POST /auth/magic-link` instead of `GET`.

  `GET /auth/magic-link` was a state-changing route reachable as a simple cross-site request, so an `<img src>` on any page could trigger unbounded magic-link emails to a signed-in user. The Express adapter removed the GET route and replaced it with POST.

  The request now carries an empty JSON body. The adapter ignores it, but the resulting JSON content type forces a CORS preflight, which is what actually keeps the route from being reachable cross-site. A bodyless POST would still be a simple request.

  BREAKING: this release requires an adapter with the POST route (`@seamless-auth/express` 0.9.0 or later). Against an older adapter, `requestMagicLink` gets a 404. Callers of `requestMagicLink()` need no code change.

- 0a37241: Surface the auth server's error detail when an OAuth callback fails. `finishOAuthLogin()` previously discarded the response body and threw a generic `Error('Failed to finish OAuth login')`, so consuming apps could not tell users what went wrong.

  It now throws a `SeamlessAuthError` carrying the server message, the HTTP `status`, and the parsed `body`. `SeamlessAuthError` is exported so callers can narrow with `instanceof` and map known failures to their own messaging. A body that is empty or not JSON is handled gracefully and falls back to the previous generic message.

  Callers matching on the exact string `'Failed to finish OAuth login'` should switch to inspecting `status` or `body`.

- 2dccbed: Request OTP generation over `POST` instead of `GET`.

  `requestPhoneOtp`, `requestEmailOtp`, `requestLoginPhoneOtp`, and `requestLoginEmailOtp` each caused an SMS or email to be sent, so they were state changing. Sent as a `GET`, they were simple cross-site requests, so an `<img src>` on any page could trigger unbounded OTP messages to a signed-in user. They now POST an empty JSON body, which forces a CORS preflight and closes the vector. This mirrors the `requestMagicLink` change.

  BREAKING: this requires an adapter serving these routes over POST (`@seamless-auth/express` with the OTP POST change, released alongside this). Against an older adapter the four request methods get a 404. Callers need no code change.

- f0c4bd9: Unify `useAuth()` on the same result convention as the headless client. Every provider helper now returns `SeamlessAuthResult` and none of them throw, so the whole SDK reports failure one way.

  ```tsx
  const { error } = await updateCredential({
    ...credential,
    friendlyName: 'Work laptop',
  });
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

- dda670b: Remove the unused `mfaRequired` field from `PasskeyLoginResult` (and the inherited `PasskeyLoginWithPrfResult`). The backend never gated passkey login on a second factor, so the field was always `false` and the related fail-closed path in `handlePasskeyLogin` was dead code.

  BREAKING: consumers reading `result.mfaRequired` from `loginWithPasskey()` should remove that check. A successful passkey login is now indicated solely by `result.success`.

### Patch Changes

- d4e455d: Correct the response types for credential and session endpoints, checked against the API's response schemas.

  `updateCredential()` on `useAuth()` now returns the credential itself. It previously returned the `{ message, credential }` wrapper while declaring `Promise<Credential>`, so callers reading a field such as `friendlyName` got `undefined`, and the cast hid the mismatch from TypeScript.

  Client return types corrected to match the server schemas:
  - `updateCredential` returns `CredentialUpdateResult` (`{ message, credential }`), replacing `CredentialMutationResult`, which modelled `credential` as optional when the API always sends it
  - `deleteCredential` returns `MessageResult`
  - `logout`, `logoutAllSessions`, and `deleteUser` return `MessageResult` rather than being typed as returning no body

  `CredentialMutationResult` is removed and replaced by `CredentialUpdateResult`.

- c17cf9c: Expand the custom UI documentation with worked examples for registration, OTP and magic-link continuation, and credential management. The OTP and magic-link section documents that `requestMagicLink()`, `requestLoginEmailOtp()`, and `requestLoginPhoneOtp()` take no identifier and depend on server-side state from a preceding `login()` call, which is not evident from their signatures.

  Also corrects README references left stale by the result-object change: the `useAuth()` signature block, the step-up examples that used `result.success`, and the PRF example that read `result.prf`.

- 41ebb86: Emit relative import paths in the published type declarations. The build kept the
  `@/*` tsconfig path aliases in the generated `.d.ts` files, which no consumer can
  resolve, so every downstream project silently saw the SDK's public surface as
  `any` (masked by `skipLibCheck`). A `tsc-alias` post-build step now rewrites the
  aliases to relative paths, restoring real types for consumers.
- 597f6d2: The bundled registration screen now asks for an email only. It previously required a phone number as well, but registration only needs an email (the API treats phone as optional and it can be added and verified later), so the field was a mismatch that blocked email-only sign-up.

  `RegisterInput.phone` is now optional (`phone?: string | null`) and is only sent when a caller provides one, so headless consumers can still submit a phone at registration if they want to.

- ede35a8: Encode the magic-link token before placing it in the request path. The token is read from a link's query string, so it is untrusted input, and leaving it unencoded let path segments inside it redirect the request to a different endpoint under `/auth`. Because requests are sent with credentials, a crafted link could cause a signed-in user's browser to call unintended endpoints, including ones that send an SMS or email. Affects 0.4.0 and earlier.
- 0f2d686: Improve request hygiene in the shared auth fetch helper. It no longer sends a JSON `Content-Type` on bodyless requests (some proxies reject a GET that advertises a request content type), and it no longer logs a `console.warn` on every non-ok response. Callers already inspect `response.ok`, and caller-provided headers still take precedence.
- 46f2a7c: Fix the magic-link waiting screen treating an unused link as completed. The poll endpoint answers `204` with no body until the emailed link is consumed, so checking only for a non-error response redirected on the first poll, before the user clicked the link. It now waits for the endpoint to report success.
- 0e208b4: Fix magic-link verification so the tab that completes the link refreshes provider state and lands authenticated, instead of relying on another tab or a manual reload.
- 90b7c14: Fix the bundled OAuth provider buttons so the callback redirect URI respects the router basename. Apps mounted under a non-root basename (for example `/app`) now send `/app/oauth/callback` instead of `/oauth/callback`, which previously failed redirect URI allowlisting or landed on a route that did not exist. Apps mounted at the root are unaffected.
- 1c4f4d2: Correct the organization response types, checked against the API's declared response schemas.
  - `addOrganizationMember` and `updateOrganizationMember` return `OrganizationMembershipResult` (`{ membership }`). They were typed as returning a members list, so reading `.members` gave `undefined`.
  - `removeOrganizationMember` returns `MessageResult`, not a members list.
  - `switchOrganization` returns `OrganizationSwitchResult` (`{ message, organizationId, organization }`), which describes what the endpoint actually sends.

  `OrganizationMembershipResult` and `OrganizationSwitchResult` are new exports.

- aa2fda8: Improve browser detection used for passkey device labels. Opera, Vivaldi, Samsung Internet, and Brave are now identified instead of being reported as Chrome, and Chrome and Firefox on iOS are recognized through their `CriOS` and `FxiOS` tokens. Chromium derivatives are now matched before the generic chrome token, so the result no longer depends on check ordering.

  Brave is detected through `navigator.brave` because it ships a user agent identical to Chrome's. Arc exposes no distinguishing marker and is still reported as chrome.

- a9580e8: Raise the `react-router-dom` v7 peer floor to `^7.15.1` to steer adopters off versions affected by a high-severity advisory (GHSA in react-router's vendored turbo-stream, affecting react-router 7.0.0 through 7.15.0). React Router 6 is unaffected, so the `^6.4.0` range is unchanged.

  This is a peer range change, so adopters on a vulnerable v7 (7.0.0 to 7.15.0) will see an npm warning until they upgrade to 7.15.1 or later. No SDK code change and no runtime behavior change.

- 5d865ab: Make the platform authenticator capability check safe to evaluate in a server environment. `isPlatformAuthenticatorAvailable` previously read `window` without a guard and threw a `ReferenceError` during server-side rendering. It now returns `false` when there is no `window`, matching the guard already used by the WebAuthn availability check.

## 0.4.0

### Minor Changes

- f26c5c0: Add TOTP (authenticator app) support. The headless client gains
  `getTotpStatus()`, `startTotpEnrollment()`, `verifyTotpEnrollment(code)`, and
  `disableTotp(code)` for enrollment and management, plus
  `verifyStepUpWithTotp(code)` for TOTP-based step-up verification.
  `AuthProvider`/`useAuth()` expose `verifyStepUpWithTotp(code)`, which refreshes
  `stepUpStatus` on success alongside the existing passkey step-up helpers. The
  `StepUpMethod` type now includes `'totp'`, and `TotpStatus` and
  `TotpEnrollmentStartResult` are exported.

  TOTP applies to step-up verification, not to the login flow: the auth API issues
  a full session on the first factor and does not gate login on TOTP.

  Requires an auth backend that exposes the `/totp/*` routes (available in
  `@seamless-auth/express` 0.6+).

### Patch Changes

- 55d5855: Fix a passwordless copy slip in the built-in Login view, which previously
  suggested resetting a password on an unexpected error (there are no passwords in
  this system).

  Docs: correct the OAuth callback example to read the provider from
  sessionStorage (matching the bundled flow) instead of hardcoding a provider,
  list the `/oauth/callback` built-in route, and complete the backend endpoint
  expectations (login OTP variants and organization routes).

## 0.3.0

### Minor Changes

- a6eafa4: Add OAuth provider UI to the built-in auth screens. The sign-in view now lists configured
  providers (via listOAuthProviders) as "Continue with <provider>" buttons that start the flow
  and redirect to the IdP, and a new /oauth/callback route finishes the login (reads code/state,
  calls finishOAuthLogin) and lands the user on the app. Closes the gap where the SDK exposed the
  OAuth client methods but had no UI or callback route to drive them.

## 0.2.1

### Patch Changes

- 26fda9d: Register with just an email. The registration form no longer requires a phone
  number (it stays optional, validated only when provided), and a successful
  registration now routes to email verification (`/verifyEmailOTP`) instead of
  phone verification — matching the auth server's email-first registration. After
  verifying the email code the user is signed in.

## 0.2.0

### Minor Changes

- 24a17b8: Release the current React SDK improvements as the first Changesets-managed package version.

  This release includes the public headless client and React hooks for custom auth UIs, expanded provider helpers for OAuth and step-up flows, scoped role utilities, OTP and passkey flow polish, and the reviewed release PR workflow for future package publishing.

## 0.1.1

### Patch Changes

- Last published version before Changesets-managed release PRs.
