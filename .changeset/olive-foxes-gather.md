---
'@seamless-auth/react': minor
---

Let the bundled screens choose where a magic link lands.

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
