---
'@seamless-auth/react': minor
'@seamless-auth/client': minor
---

Support the Next.js App Router.

- Every module in `@seamless-auth/react` now ships with a `'use client'` directive, so `AuthProvider` renders straight from a server layout. The build fails if the directive goes missing from any emitted file.
- **Breaking:** `AuthRoutes` moved to `@seamless-auth/react/routes`, and `react-router-dom` is now an optional peer. Change `import { AuthRoutes } from '@seamless-auth/react'` to `import { AuthRoutes } from '@seamless-auth/react/routes'`. Applications that do not render the bundled screens no longer need react-router installed.
- Fixed a hydration mismatch for returning users. `hasSignedInBefore` was read from `localStorage` on the client's first render, which the server could not match. The store now exposes `getServerState()`, and the provider hydrates from it.
- `AuthProvider` and `createAuthSession` accept `initialSession`, a session the server already resolved (or `null`). The first paint renders it settled instead of loading, and the session then revalidates in the background.
- `refreshSession({ background: true })` revalidates without reporting `loading`.
