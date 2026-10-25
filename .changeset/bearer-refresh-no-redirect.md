---
'@seamless-auth/client': patch
'@seamless-auth/react-native': patch
---

The bearer `POST /refresh` no longer follows a redirect. It is sent with `redirect: 'manual'`, and any `3xx` answer, a redirect the browser hides, or a response that a platform followed to an origin outside `apiHost` and `trustedOrigins` (as React Native's `fetch` does) is refused with `UntrustedRedirectError`. The held session is cleared, because it can no longer be renewed through that server. Before, a redirect on the refresh route resent the refresh token to the redirect target.
