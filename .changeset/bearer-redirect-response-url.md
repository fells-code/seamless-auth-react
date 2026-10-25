---
'@seamless-auth/client': patch
'@seamless-auth/react-native': patch
---

The bearer redirect guard now works on React Native. Its `fetch` follows redirects itself and never sets `response.redirected`, so a response that a redirect took to another origin was handed back as if it came from the API. A bearer request now rejects with `UntrustedRedirectError` whenever the response's final URL differs from the one requested and is not on `apiHost` or `trustedOrigins`. On React Native this detects such a redirect after it happened rather than preventing it, so the token may already have been sent on the followed hop.
