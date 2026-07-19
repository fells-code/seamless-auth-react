---
'@seamless-auth/react': patch
---

Fix the bundled OAuth provider buttons so the callback redirect URI respects the router basename. Apps mounted under a non-root basename (for example `/app`) now send `/app/oauth/callback` instead of `/oauth/callback`, which previously failed redirect URI allowlisting or landed on a route that did not exist. Apps mounted at the root are unaffected.
