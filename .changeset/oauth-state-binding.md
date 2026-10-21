---
'@seamless-auth/client': patch
'@seamless-auth/react': patch
'@seamless-auth/react-native': patch
---

OAuth sign-in now carries the state binding the auth server returns from `POST /oauth/:providerId/start` back to the callback. The session actions `startOAuthLogin` and `finishOAuthLogin` (and so `useAuth()` in React and React Native, and the Angular, Vue and Svelte bindings) store the binding with its state, attach it to the matching callback, and clear it afterwards, so apps that call these actions directly need no code change. The binding is kept in `sessionStorage` under `seamless:oauth:binding` in a browser and in memory elsewhere, and is never sent to the provider or put in a URL. `startOAuthSignIn` passes it explicitly when an in-app browser hands the callback back, and now refuses a callback whose state is not the one it started.

`StartOAuthLoginResult` gains an optional `binding` and `FinishOAuthLoginInput` an optional `binding`. Older auth servers return no binding and are unaffected. Auth API 0.19.x with fells-code/seamless-auth-api#463 refuses a callback without the binding, so upgrade this SDK before or with that API release.
