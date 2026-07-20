---
'@seamless-auth/react': minor
---

Request magic links over `POST /auth/magic-link` instead of `GET`.

`GET /auth/magic-link` was a state-changing route reachable as a simple cross-site request, so an `<img src>` on any page could trigger unbounded magic-link emails to a signed-in user. The Express adapter removed the GET route and replaced it with POST.

The request now carries an empty JSON body. The adapter ignores it, but the resulting JSON content type forces a CORS preflight, which is what actually keeps the route from being reachable cross-site. A bodyless POST would still be a simple request.

BREAKING: this release requires an adapter with the POST route (`@seamless-auth/express` 0.9.0 or later). Against an older adapter, `requestMagicLink` gets a 404. Callers of `requestMagicLink()` need no code change.
