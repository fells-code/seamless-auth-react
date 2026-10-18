---
'@seamless-auth/client': minor
'@seamless-auth/react': patch
'@seamless-auth/react-native': patch
---

In bearer transport, a request that carries a token no longer follows a redirect to an origin outside `apiHost` and `trustedOrigins`. The client asks `fetch` for `redirect: 'manual'`, follows a redirect to a trusted origin itself (up to five hops, turning a `303`, or a `301` or `302` after a POST, into a GET as `fetch` does), and rejects any other with the new `UntrustedRedirectError` without sending the token on. Where the platform follows redirects regardless, as React Native's `fetch` does, a response that ended on another origin is rejected instead. A caller that sets `redirect` itself keeps that choice, and the final-origin check still applies. Requests without a token, and cookie transport, are unchanged.
