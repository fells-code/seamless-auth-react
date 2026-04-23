# AGENTS.md

This file is for coding agents working in the `@seamless-auth/react` repository.

Use it as the repo-level source of truth for what this package is today, how it fits into the wider Seamless Auth ecosystem, and what kinds of changes should be reinforced instead of reintroducing older patterns.

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

- `../seamless-auth-starter-react`
- `../seamless-auth-admin-dashboard`
- `../seamless-auth-docs`
- `../seamless-auth-server`
- `../seamless-auth-api`

Common usage patterns:

- `seamless-auth-starter-react` is the best reference for the drop-in `AuthRoutes` path
- `seamless-auth-admin-dashboard` is a good reference for consuming provider state and helpers without using bundled routes
- `seamless-auth-docs` may lag behind this repo, so treat this repo as the source of truth when docs conflict with source

## Runtime Model

This package assumes cookie-based auth flows and a Seamless Auth-compatible backend.

`createFetchWithAuth()` is the shared request helper:

- it always sends `credentials: "include"`
- in `web` mode it targets `${authHost}/...`
- in `server` mode it targets `${authHost}/auth/...`

The common deployment shape is `server` mode against a backend that mounts the Seamless Auth routes under `/auth`.

Important implication:

- frontend behavior here is tightly coupled to backend route names and cookie/session expectations
- if request paths or auth flow ordering seem questionable, inspect `seamless-auth-server` or `seamless-auth-api` before changing code or docs

## Current Public API

Exports from `src/index.ts` currently include:

- `AuthProvider`
- `AuthRoutes`
- `createSeamlessAuthClient`
- `useAuth`
- `useAuthClient`
- `usePasskeySupport`

Exported types currently include:

- `AuthContextType`
- `AuthMode`
- `Credential`
- `CurrentUserResult`
- `LoginInput`
- `PasskeyLoginResult`
- `PasskeyMetadata`
- `PasskeyRegistrationResult`
- `RegisterInput`
- `SeamlessAuthClient`
- `SeamlessAuthClientOptions`
- `User`

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
  - mode-aware request construction
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
- `/logout`
- `/registration/register`
- `/webAuthn/login/start`
- `/webAuthn/login/finish`
- `/webAuthn/register/start`
- `/webAuthn/register/finish`
- `/otp/generate-phone-otp`
- `/otp/generate-email-otp`
- `/otp/verify-phone-otp`
- `/otp/verify-email-otp`
- `/magic-link`
- `/magic-link/check`
- `/magic-link/verify/:token`
- `/users/me`
- `/users/credentials`
- `/users/delete`

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
