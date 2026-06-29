---
"@seamless-auth/react": minor
---

Add OAuth provider UI to the built-in auth screens. The sign-in view now lists configured
providers (via listOAuthProviders) as "Continue with <provider>" buttons that start the flow
and redirect to the IdP, and a new /oauth/callback route finishes the login (reads code/state,
calls finishOAuthLogin) and lands the user on the app. Closes the gap where the SDK exposed the
OAuth client methods but had no UI or callback route to drive them.
