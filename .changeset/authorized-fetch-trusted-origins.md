---
'@seamless-auth/client': minor
'@seamless-auth/react': minor
'@seamless-auth/react-native': minor
'@seamless-auth/angular': minor
---

`authorizedFetch` (and `useAuthorizedFetch`) now sends the session only to `apiHost` and to origins you list in the new `trustedOrigins` option. A request to any other origin rejects with `UntrustedOriginError` and is never sent, so the session cookies, or in React Native the access token, cannot reach a third party through it. Paths, and full URLs on `apiHost`, work as before; a relative URL that does not start with `/` is now refused, and each `trustedOrigins` entry must be a bare `https` origin (`http` only on localhost). If your own API is served from a different origin than the auth adapter, add that origin: `transport: { trustedOrigins: ['https://api.example.com'] }` on the React `AuthProvider`, the `trustedOrigins` prop on the React Native `AuthProvider`, or `trustedOrigins` in `provideSeamlessAuth`, which `seamlessAuthInterceptor` also honours.
