# @seamless-auth/react

## 0.11.0

### Minor Changes

- bd26c22: Read the `returnTo` an OAuth sign-in asked for, and land on it.

  `startOAuthLogin` has taken a `returnTo` since OAuth landed here, and nothing ever read one
  back. The auth server validated it against the configured origins and signed it into the
  state, but `finishOAuthLogin` was typed as a bare `MessageResult`, so the whole callback body
  was discarded and an adopter had no way to learn where the flow had been asked to end up.

  `finishOAuthLogin` now resolves to `FinishOAuthLoginResult`, the completed OAuth response
  minus its session material, for the same reason `LoginStartResult` drops it: sessions are
  carried by cookies, so there is no reason to hand an adopter raw tokens. The new field on it
  is `returnTo`, absent when the caller asked for nothing.

  The bundled `OAuthCallback` view lands there instead of always going to `/`. This is the same
  gap the magic link redirect closed in 0.10.0: the headless client could reach the feature and
  an application using `AuthRoutes` could not, which is the audience least likely to be wiring
  up its own client.

  The view only follows a destination on its own origin. That is not the guard against an open
  redirect, which the auth server already applied before signing the state; it is that these
  views route with react-router, which cannot leave the application. An adopter that wants to
  send someone to another origin reads `returnTo` off the result and navigates itself.

  Requires `@seamless-auth/types` 0.20.0, which carries the response field and holds both
  `returnTo` fields to a scheme that can be a link destination.

- 74f17d2: Let the bundled screens choose where a magic link lands.

  `requestMagicLink(redirectUri)` arrived in 0.10.0, but only the headless client
  path could reach it. An application using `AuthRoutes` had no way to set one, so
  the deployment-wide destination was the only option for the audience least likely
  to be wiring up its own client.

  `AuthProvider` now takes `magicLinkRedirectUri`, and `useAuthClient()` hands it to
  the client as the default for every send. `SeamlessAuthClientOptions` carries the
  same field, so a directly constructed client can do this too.

  The destination lives on the client rather than at each call site on purpose. The
  sign-in screen and the resend on the "check your email" screen both send with no
  argument, so they cannot disagree about where the link goes. A resend that landed
  somewhere other than the link it repeats would be a confusing failure and an easy
  one to miss in review.

  Nothing changes if you omit it: the same empty body is sent and the deployment's
  own destination still applies. An explicit `requestMagicLink(uri)` still wins over
  the configured default.

- eb10397: Stop painting the disabled submit button as a filled grey primary.

  On the sign-in and MFA screens the submit button was disabled until its field
  validated, and while disabled it was filled with `--seamless-disabled` while the
  label kept `--seamless-accent-contrast`. Those two colours were chosen in
  different places, so no value a themed app could supply worked in both a light
  and a dark theme: lighten the fill and the label washed out, darken it and the
  label went near-black on dark. The result read as a primary button that had
  broken rather than a control waiting on input.

  The disabled state is now the enabled button at reduced opacity. Label and
  background stay on the accent pair the app already tuned, so their contrast
  cannot invert with the theme, and the control reads as inactive instead of
  broken. This matches how the magic-link and passkey screens already draw their
  disabled buttons.

  `--seamless-disabled` is no longer read anywhere and has been dropped from the
  token table. If you set it, remove it; every other token behaves as before.

  The sign-in screen now also says why the button is refusing, in a live region
  below it that reports whether the field is empty, incomplete, or ready. A
  disabled button is not focusable and is passed over by screen readers, so the
  refusal was previously silent for the people least able to guess the reason.

  Fixing that surfaced a related bug: a valid email typed in registration left the
  Login button enabled after switching to sign-in, even with the identifier field
  empty, because the submit check fell through to the registration field. Each
  mode now checks only its own field.

## 0.10.0

### Minor Changes

- 17a657d: Let a caller choose where a magic link lands.

  `requestMagicLink` takes an optional `redirectUri`. A deployment serving both a web
  app and a mobile app previously had one destination for every magic link, so a link
  had to arrive in one or the other.

  The value goes in the request body the client already sends. The deployment validates
  it against its configured origins and refuses anything else, so this cannot be used to
  point a link on the tenant's domain somewhere it should not go, and a refusal comes
  back as an ordinary error result.

  Omit it and nothing changes: the same empty body is sent, so the destination stays the
  deployment's own and no caller has to do anything.

  Needs a `@seamless-auth/server` adapter that forwards the field and an auth API that
  understands it. Against older versions the value is dropped and the link keeps the
  deployment's destination, which is the behaviour today.

- 4199d52: Add `getPasskeyPolicyErrorCode()`, which reads the code a refused passkey
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

- 8690cb0: Drop the naming step from the bundled passkey enrolment view.

  Choosing "Register Passkey" (or "Use a security key instead") opened a modal asking for a
  friendly name, and the browser's own passkey prompt only appeared once that form was
  submitted. A user who came to the screen to press one button was handed a text field
  first, at the point in the flow where they had the least idea what to type.

  Registration now starts on the click. The credential still carries a `friendlyName`, and
  the view fills it with the device the passkey was enrolled on (`mac • chrome`), which is
  what the naming prompt suggested people write anyway. Renaming stays available through
  `updateCredential`.

  Nothing in the public API moves: `PasskeyMetadata.friendlyName` is unchanged and callers
  building their own enrolment screen keep setting it themselves. Only the bundled
  `/register-passkey` view changes, so an adopter relying on that screen to collect a name
  needs their own screen for it.

- fa27861: `registerPasskey()` accepts an `attachment`, so a caller can ask for a roaming
  authenticator (`cross-platform`, a USB or NFC security key) or the one built
  into the device (`platform`) instead of leaving the choice to the browser's
  picker. The bundled enrolment view offers a "Use a security key instead" control
  that takes this path, and explains a policy refusal rather than showing a
  generic failure.

  Omitting the option sends no query parameter, so the deployment's
  `authenticator_policy.attachment` stays in charge and current behaviour is
  unchanged. It is a request rather than an override: a deployment that pins the
  other kind refuses the registration with `attachment_not_allowed`, which
  `getPasskeyPolicyErrorCode()` reads.

  `PasskeyAttachment` is exported, and is derived from the deployment policy type
  in `@seamless-auth/types` rather than restating its members.

## 0.9.0

### Minor Changes

- 4ea4fd0: feat(styles): make the built-in auth UI themeable with CSS custom properties

  Every colour in the bundled screens now reads from a `--seamless-*` custom property with the previous
  literal as its fallback, so consumers can match the auth UI to their brand by setting variables on
  `:root` or on any ancestor of `<AuthRoutes />`.

  This is opt-in and non-breaking. Applications that set nothing render exactly as before.

## 0.8.0

### Minor Changes

- 28623e2: Offer a way past passkey registration when another login method is enabled.

  Registration used to end on a screen with one control on it. A user who did not want a passkey, or
  whose device could not make one, had no way forward: the unsupported branch rendered a message and
  nothing else, on a screen with no exit. The session already exists by then, since the OTP step that
  leads here establishes it, so leaving without a passkey was always a legitimate way to finish.

  `useLoginMethods` reads the instance configuration from the auth server, and the skip only appears
  when a method other than `passkey` is enabled. With passkey as the only method a skip would leave a
  user unable to sign back into the account they just created, so the control is not rendered at all.
  Unknown counts as unsafe: a failed or in-flight read shows no skip rather than guessing.

  The unsupported-device branch now says which case it is, and offers the same way forward when one
  exists.

  `Login` no longer starts from a hardcoded `['passkey', 'magic_link', 'phone_otp']`. It uses the
  methods the instance reports, falling back to the narrower `['passkey', 'magic_link']` that matches
  the auth server's own defaults. The login response stays authoritative when it carries methods of
  its own.

  Requires an auth server serving `GET /system-config/public`, and an adapter that proxies it.

## 0.7.0

### Minor Changes

- b4b7ca1: Stop discarding the underlying WebAuthn error. The passkey login, passkey registration, and step-up verification methods now attach the thrown ceremony error to the returned `SeamlessAuthError` as `cause`, and a new `getWebAuthnErrorDetail()` export reads its `name`, `code`, and `message`. Callers can tell a dismissed prompt or missing credential (`NotAllowedError`) apart from an origin or RP ID mismatch (`SecurityError`) instead of seeing one generic string. The friendly result messages are unchanged, and only the error name is logged.
- 41dfea7: Adopt `@seamless-auth/types` for the API request and response shapes. The SDK's types were hand-written and maintained in parallel with the auth API's schemas; they are now aliases of the published contract, so they cannot drift from what the API actually sends. The dependency is types-only, imported with `import type`, so no schema validation library reaches your bundle and the export names you import are unchanged.

  Some types are now more accurate, which is a breaking change at the type level for adopters:
  - `Credential.lastUsedAt` is `string | null | undefined`, not `Date | null`. The API serializes it as an ISO 8601 string, so code calling a `Date` method on it was relying on a type that never matched the wire value and threw at runtime. Wrap it yourself: `new Date(credential.lastUsedAt)`.
  - `Credential.deviceType`, `friendlyName`, `platform`, `browser`, and `deviceInfo` are optional, matching the API. `Credential.createdAt` is now present.
  - `User.phone` is `string | null`, and `User.roles` is required rather than optional. `User` also carries `lastLogin`.
  - `Organization.createdAt` and `updatedAt` are `string` rather than `string | Date`.

  No runtime behavior changes.

- 3922389: Surface OAuth callback error codes. A new `getOAuthErrorCode()` export reads the auth API's machine-readable `code` off a `SeamlessAuthError` and narrows it to `oauth_missing_email`, `oauth_email_not_verified`, or `oauth_missing_subject`, returning `undefined` for anything unrecognized. The bundled OAuth callback screen now maps those three codes to actionable text instead of one generic failure message.

### Patch Changes

- a82768d: Read the OAuth failure code from a nested `details` object when the error body does not carry it at the top level. `getOAuthErrorCode` only looked at a top-level `code`, which is where the auth API puts it, so a proxy that normalized the error body and moved the siblings of `error` under `details` silently downgraded OAuth messaging to a generic failure. Both locations are accepted now, the top level still wins, and the allowlist is unchanged: an unrecognized code in either place still returns `undefined`.
- e27dcca: Stop calling the logout endpoint when the session check fails. A failed `/users/me` means the server already considers the session unusable, so the SDK now clears it locally instead of sending a `DELETE /logout` for a session that does not exist. Previously every anonymous page load fired that second request.

  Session state now lives in a framework-agnostic store behind `AuthProvider`, which reads it through `useSyncExternalStore`. The provider's public API is unchanged. Reading a previous sign-in goes through a storage port that falls back to memory when there is no `localStorage`, so the store is safe to create during server-side rendering.

  The store survives a remount. React can run mount, cleanup, mount against the same provider, which StrictMode does on every mount and Activity does whenever a hidden tree is shown again, so the provider no longer destroys the store from its effect cleanup. `destroy()` is terminal, and tearing it down there left the remounted provider holding a store that refused every update and stayed on `loading: true`.

- 83bf7b8: Take the last five response envelopes from `@seamless-auth/types` instead of declaring them here. `OAuthProvidersResult`, `CredentialUpdateResult`, `OrganizationResult`, `OrganizationMembersResult`, and `OrganizationMembershipResult` were hand-written because the package had no exported alias for their schemas; types 0.4.0 exports one for every schema, so they are aliases now like the rest. The shapes are identical, so this is a no-op for adopters, and the dependency stays types-only.

## 0.6.0

### Minor Changes

- 1917ed7: Remove the admin bootstrap invite path from registration.

  The Seamless Auth API dropped the bootstrap invite flow, so `POST /registration/register` no longer accepts a `bootstrapToken`. The field was silently stripped by the API's non-strict body schema, which made the client code dead: the bundled login screen read a `bootstrapToken` query parameter and forwarded it, and the value went nowhere.

  BREAKING: `RegisterInput.bootstrapToken` is gone. It was optional, so callers that never set it need no change. Callers that did pass it should drop the field, since nothing on the server consumed it.

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
