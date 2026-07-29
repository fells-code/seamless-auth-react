---
'@seamless-auth/react': patch
---

Read the OAuth failure code from a nested `details` object when the error body does not carry it at the top level. `getOAuthErrorCode` only looked at a top-level `code`, which is where the auth API puts it, so a proxy that normalized the error body and moved the siblings of `error` under `details` silently downgraded OAuth messaging to a generic failure. Both locations are accepted now, the top level still wins, and the allowlist is unchanged: an unrecognized code in either place still returns `undefined`.
