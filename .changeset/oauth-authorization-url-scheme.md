---
'@seamless-auth/client': patch
'@seamless-auth/react-native': patch
---

The OAuth redirect ports now open only an `https` authorization URL, or `http` on `localhost`, `127.0.0.1` or `[::1]` for local development. The browser port (`createBrowserOAuthRedirect`) and the React Native port (`createWebBrowserOAuthRedirect`) throw the new `UnsafeAuthorizationUrlError` for anything else, such as a `javascript:` or `data:` URL in any letter case or with embedded tabs, and never navigate to it. `startOAuthSignIn`, which every bundled sign-in screen uses, reports that as a provider that could not start. A custom `OAuthRedirectPort` can use the new `assertNavigableAuthorizationUrl(url)`. Auth API 0.19.4 already refuses to store or return such a URL, so this guards against an older or misconfigured server.
