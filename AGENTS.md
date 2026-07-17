# AGENTS.md

This file is for coding agents working in the `@seamless-auth/react` repository.

Use it as the repo-level source of truth for what this package is today, how it fits into the wider Seamless Auth ecosystem, and what kinds of changes should be reinforced instead of reintroducing older patterns.

## Working Standards (fells-code baseline)

These rules apply to every repository in the fells-code org. Repo-specific
guidance may extend them but must not contradict them.

### Attribution

- Commit and open PRs solely under the repository owner's identity. Never
  commit under an agent or assistant identity.
- Never attribute work to an AI assistant: no `Co-Authored-By: Claude` (or any
  assistant) trailers, no "Generated with" / "Created with Claude" notes, and no
  assistant branding or emoji anywhere in commit messages, PR or issue titles
  and descriptions, changesets, code comments, or docs.

### Comments

- Comment only when the code genuinely needs explaining: a non-obvious reason, a
  gotcha, or an invariant. Never narrate what the code plainly does.

### TODOs

- Every `TODO`/`FIXME` must reference a ticket, e.g. `// TODO(#123): ...`.
  Do not leave a bare TODO. If no ticket exists, create one first.

### Commits & branches

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`).
- Descriptive branch names (`feat/...`, `fix/...`); never a `claude/` or other
  tool-generated prefix.

### Public-facing text

- No em dashes in commit messages, code comments, PR or issue text, changesets,
  or docs. Use a comma, parentheses, or a separate sentence.

### Before declaring work done

- All code quality checks must pass before you open a PR or call the work done:
  tests, linting, type checks, and formatting. Run them and report the real
  output; do not open a PR while any check is failing.
- Typical commands: `npm run typecheck`, `npm run lint`, `npm run format:check`
  (or `npm run format`), and `npm test`. Never claim a change works without
  running them.
- Match the surrounding code's style, naming, and comment density.

## Purpose

This repo publishes `@seamless-auth/react`.

The package now supports both of these usage styles:

- a fast-start path with `AuthProvider` and `AuthRoutes`
- a headless-capable SDK path with exported client helpers and React hooks for custom auth UIs

When making changes, bias toward:

- public, documented auth primitives
- optional built-in UI
- one shared implementation path used by both custom UIs and bundled screens

Avoid pushing the repo back toward “private logic hidden in screens.”

## Where This Package Sits

This package is the frontend React SDK in a wider Seamless Auth stack.

Useful sibling repos to inspect when behavior is unclear:

- `../seamless-templates`
- `../seamless-auth-admin-dashboard`
- `../seamless-auth-docs`
- `../seamless-auth-server`
- `../seamless-auth-api`

Common usage patterns:

- `seamless-templates` (`templates/web/react-vite`) is the best reference for the drop-in `AuthRoutes` path
- `seamless-auth-admin-dashboard` is a good reference for consuming provider state and helpers without using bundled routes
- `seamless-auth-docs` may lag behind this repo, so treat this repo as the source of truth when docs conflict with source

## Runtime Model

This package assumes a Seamless Auth-compatible backend mounted under `/auth`.

`createFetchWithAuth()` is the shared request helper:

- it always sends `credentials: "include"`
- it targets `${authHost}/auth/...`

Important implication:

- frontend behavior here is tightly coupled to backend route names and cookie/session expectations
- if request paths or auth flow ordering seem questionable, inspect `seamless-auth-server` or `seamless-auth-api` before changing code or docs

## Current Public API

`src/index.ts` is the authoritative export list. Treat the enumeration below as a
summary and re-check `src/index.ts` before relying on it.

Runtime exports currently include:

- `AuthProvider`
- `AuthRoutes`
- `createSeamlessAuthClient`
- `useAuth`
- `useAuthClient`
- `usePasskeySupport`
- `hasScopedRole` and `roleGrantsAccess`
- `encodePrfSalt`, `extractPasskeyPrfResult`, and `isPasskeyPrfSupported`

Exported types currently include the provider/client input and result types plus
domain models, for example:

- `AuthContextType`, `Credential`, `User`, `Organization`, `OrganizationMembership`
- `LoginInput`, `LoginMethod`, `LoginStartResult`, `RegisterInput`, `CurrentUserResult`
- `PasskeyMetadata`, `PasskeyLoginResult`, `PasskeyLoginWithPrfResult`, `PasskeyRegistrationResult`, `RegisterPasskeyOptions`
- `PasskeyPrfInput`, `PasskeyPrfResult`
- OAuth types: `OAuthProvider`, `OAuthProvidersResult`, `StartOAuthLoginInput`, `StartOAuthLoginResult`, `FinishOAuthLoginInput`
- Organization types: `CreateOrganizationInput`, `UpdateOrganizationInput`, `OrganizationMemberInput`, `OrganizationMemberUpdateInput`, `OrganizationsResult`, `OrganizationResult`, `OrganizationMembersResult`
- Step-up types: `StepUpMethod`, `StepUpStatus`, `StepUpVerificationResult`, `StepUpWithPasskeyPrfResult`
- `SeamlessAuthClient` and `SeamlessAuthClientOptions`

Public API changes should be treated deliberately:

- if something is not exported from `src/index.ts`, it is not public
- once something is exported, it should be supportable and documented
- built-in UI should consume public primitives whenever practical instead of reaching into private helpers

## Current Architecture

The current package is organized around a shared SDK core with optional UI layered on top:

- `src/AuthProvider.tsx`
  - owns auth/session state
  - exposes the main provider context
  - validates the session with `/users/me`
  - exposes refresh, login, logout, user deletion, and credential actions
- `src/client/createSeamlessAuthClient.ts`
  - shared headless auth client
  - contains the backend request choreography for login, registration, OTP, magic-link, passkey flows, and credential mutations
- `src/hooks/useAuthClient.ts`
  - creates a memoized client from provider configuration
- `src/hooks/usePasskeySupport.ts`
  - exposes browser support detection for passkeys
- `src/AuthRoutes.tsx`
  - bundles the prebuilt auth route flow
- `src/views/*`
  - bundled route screens that now consume the public provider/client layer
- `src/components/*`
  - reusable UI pieces for those bundled screens
- `src/fetchWithAuth.ts`
  - `/auth` request construction
- `src/types.ts`
  - shared user and credential types
- `tests/*`
  - Jest + Testing Library coverage for provider, client, hooks, and views

Important architectural reality:

- the internal-only auth context path is gone
- built-in screens now use public primitives instead of hidden refresh helpers
- remaining work is mostly docs, examples, and incremental polish rather than major extraction plumbing

## Backend Endpoints Assumed By The SDK

The built-in flows and exported client assume these route families exist:

- `/login`
- `/logout` and `/logout/all`
- `/registration/register`
- `/webAuthn/login/start`
- `/webAuthn/login/finish`
- `/webAuthn/register/start`
- `/webAuthn/register/finish`
- `/otp/generate-phone-otp`, `/otp/generate-email-otp`, and their `-login-` variants
- `/otp/verify-phone-otp`, `/otp/verify-email-otp`, and their `-login-` variants
- `/magic-link`
- `/magic-link/check`
- `/magic-link/verify/:token`
- `/oauth/providers`, `/oauth/:providerId/start`, `/oauth/:providerId/callback`
- `/step-up/status`, `/step-up/webauthn/start`, `/step-up/webauthn/finish`
- `/organizations` and `/organizations/:organizationId` (plus `/switch` and `/members` subroutes)
- `/users/me`
- `/users/credentials`
- `/users/delete`

The `@seamless-auth/express` adapter mounts the WebAuthn routes as `/webAuthn`
(camelCase), and its cookie middleware matches request paths case-sensitively.
Keep the client paths byte-for-byte aligned with the adapter's mounted paths;
do not "normalize" casing here in isolation.

Before documenting new flow behavior, verify the route contract in `seamless-auth-server` or `seamless-auth-api`.

## Migration Status

The SDK migration that moved this package from UI-first internals toward public primitives is effectively complete.

Completed outcomes:

- route and docs drift from the earlier transition period were cleaned up
- the shared client was extracted into `createSeamlessAuthClient()`
- public React hooks were added for custom UIs
- `useAuth()` now exposes `refreshSession()`
- bundled screens were rewritten to use public primitives
- the old internal auth context was removed

That means future work should usually build on the current public surface rather than adding another parallel abstraction.

## Preferred Change Patterns

Bias toward these patterns:

- add reusable behavior to the headless client first, then expose it through React hooks or provider helpers as needed
- keep `AuthProvider` as the source of truth for auth/session state
- use `refreshSession()` when custom flows need to synchronize provider state after a successful auth step
- export types intentionally from `src/index.ts`
- keep built-in views thin and aligned with public APIs
- update README and adjacent docs when the supported contract changes

For docs work:

- update this repo first
- then update `../seamless-auth-docs` if the public contract changed
- prefer examples that show custom UI usage, not just `AuthRoutes`

## Current Rough Edges

The biggest remaining gaps are no longer hidden internals. They are mostly polish and documentation-oriented:

- custom UI examples can still be improved, especially full end-to-end examples for bespoke login and registration screens
- passkey login currently handles the no-MFA and unsupported-browser paths cleanly, but there is still no bundled MFA continuation route
- some client methods intentionally return raw `Response` objects, so callers are responsible for checking `response.ok` and handling body parsing consistently
- public docs in sibling repos may still reflect older package behavior

If you tackle one of these, keep the solution aligned with the existing public surface instead of reintroducing private screen-only helpers.

## Testing And Validation

Primary local checks:

- `npm run lint`
- `npm test -- --runInBand`
- `npm run build`
- `npm run check-npm-build`

Use at least `npm test -- --runInBand` and `npm run build` for public API or docs-sensitive changes that affect exports, route assumptions, or package output.

If you change exports or route behavior, also inspect:

- `dist/index.d.ts`
- provider tests
- hook tests
- route/view tests
- sibling consumer repos if the change affects usage patterns

## Safe Workflow For Agents

When changing this repo:

1. Identify whether the change affects provider state, headless client behavior, bundled UI, or docs.
2. Inspect sibling repos when behavior or expectations are unclear.
3. Verify backend route assumptions before changing request paths or examples.
4. Keep the export boundary explicit in `src/index.ts`.
5. Make built-in screens consume the same public primitive whenever possible.
6. Update README and related docs when supported behavior changes.
7. Run relevant validation before finishing.

## What To Avoid

Avoid these patterns unless the user explicitly asks for them:

- adding new auth flow logic only inside route components
- introducing hidden helper contexts for bundled screens
- exporting unstable internals without documenting them
- changing endpoint assumptions without checking the server/api repos
- leaving README or repo guidance out of sync with the actual exports
- creating a second source of truth for session state outside `AuthProvider`

Commit hygiene, attribution, comments, TODOs, and public-facing-text rules live
in Working Standards above.
