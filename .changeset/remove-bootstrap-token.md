---
'@seamless-auth/react': minor
---

Remove the admin bootstrap invite path from registration.

The Seamless Auth API dropped the bootstrap invite flow, so `POST /registration/register` no longer accepts a `bootstrapToken`. The field was silently stripped by the API's non-strict body schema, which made the client code dead: the bundled login screen read a `bootstrapToken` query parameter and forwarded it, and the value went nowhere.

BREAKING: `RegisterInput.bootstrapToken` is gone. It was optional, so callers that never set it need no change. Callers that did pass it should drop the field, since nothing on the server consumed it.
