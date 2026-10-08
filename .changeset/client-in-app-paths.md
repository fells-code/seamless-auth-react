---
'@seamless-auth/client': patch
'@seamless-auth/react': patch
---

The bundled screens now refuse a post-sign-in destination that a browser would read as another site. That covers a same-origin `returnTo` whose path starts with `//`, and a path hiding `//` behind a tab or newline. Older react-router 6 releases hand such a path to `window.location`, so it could have sent a user off-site.
