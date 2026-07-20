---
'@seamless-auth/react': patch
---

Encode the magic-link token before placing it in the request path. The token is read from a link's query string, so it is untrusted input, and leaving it unencoded let path segments inside it redirect the request to a different endpoint under `/auth`. Because requests are sent with credentials, a crafted link could cause a signed-in user's browser to call unintended endpoints, including ones that send an SMS or email. Affects 0.4.0 and earlier.
