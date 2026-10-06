---
'@seamless-auth/client': minor
'@seamless-auth/react': minor
---

Support signing in through a legacy identity provider during a migration cutover (fells-code/seamless-auth-api#337).

- `getOAuthErrorCode` recognises `oauth_provider_retired` (the user's organization no longer signs in with that provider) and `oauth_invalid_id_token`.
- The bundled OAuth callback sends the user to passkey enrollment when the sign-in response carries `nextStep: 'enroll_passkey'`, and the passkey screen then continues to the `returnTo` the flow asked for instead of always going home.
- The callback shows a specific message for both new codes.

Requires `@seamless-auth/types` 0.25.0.
