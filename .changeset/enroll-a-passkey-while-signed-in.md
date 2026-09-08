---
'@seamless-auth/react': minor
---

Add a passkey while signed in, and say what a 401 at enrollment means.

`registerPasskey` is now on `useAuth()` and on the framework-agnostic session actions,
not only on the client. The bundled UI already told users they could "add a passkey later
from a device that does", and nothing in the package implemented that: `credentials` could
be listed and deleted but never added. The context version refreshes the session
afterwards, so a settings screen renders the new passkey without a reload.

Enrollment now requires a signed-in session, which is a coordinated change with
`seamless-auth-api` and the server adapters. The signup flow already satisfies it, because
verifying the email OTP issues a session before the passkey screen is reached, so nothing
in the bundled views moves. An application that called `registerPasskey()` before
verifying an address has to move that call after it.

A 401 from enrollment now reads "Your session expired before the passkey was saved" rather
than the generic "Error registering passkey." It is the session rather than anything about
the authenticator, and the generic wording invited the user to retry with the same expired
one. `isUnauthenticated(error)` is exported for callers rendering their own screens.

Corrects a stale README example that still passed a `token` to `registerPasskey`, a field
removed when the wire contract moved to `@seamless-auth/types`.
