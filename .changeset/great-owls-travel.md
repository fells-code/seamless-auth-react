---
'@seamless-auth/react': minor
---

Let a caller choose where a magic link lands.

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
