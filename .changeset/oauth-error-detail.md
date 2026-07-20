---
'@seamless-auth/react': minor
---

Surface the auth server's error detail when an OAuth callback fails. `finishOAuthLogin()` previously discarded the response body and threw a generic `Error('Failed to finish OAuth login')`, so consuming apps could not tell users what went wrong.

It now throws a `SeamlessAuthError` carrying the server message, the HTTP `status`, and the parsed `body`. `SeamlessAuthError` is exported so callers can narrow with `instanceof` and map known failures to their own messaging. A body that is empty or not JSON is handled gracefully and falls back to the previous generic message.

Callers matching on the exact string `'Failed to finish OAuth login'` should switch to inspecting `status` or `body`.
