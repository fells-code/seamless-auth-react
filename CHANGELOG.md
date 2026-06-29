# @seamless-auth/react

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
