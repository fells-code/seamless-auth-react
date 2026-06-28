# @seamless-auth/react

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
