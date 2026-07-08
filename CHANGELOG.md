# @seamless-auth/react

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
