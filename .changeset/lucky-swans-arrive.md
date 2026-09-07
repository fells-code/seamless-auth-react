---
'@seamless-auth/react': minor
---

Read the `returnTo` an OAuth sign-in asked for, and land on it.

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
