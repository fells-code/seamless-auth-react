---
'@seamless-auth/react': minor
---

`AuthProvider` is cookie transport only. Its `transport` prop no longer accepts `mode` or `tokenStorage`, and passing `mode: 'bearer'` throws, so in a browser the tokens stay with the server adapter in `httpOnly` cookies and a script on the page can never read them. `basePath`, `fetch` and `trustedOrigins` are unchanged. Native apps that need bearer transport use `@seamless-auth/react-native`, which is unaffected. No first-party template, the admin console or RoxTarget used bearer mode from `@seamless-auth/react`.
