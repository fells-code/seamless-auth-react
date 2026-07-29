---
'@seamless-auth/react': patch
---

Take the last five response envelopes from `@seamless-auth/types` instead of declaring them here. `OAuthProvidersResult`, `CredentialUpdateResult`, `OrganizationResult`, `OrganizationMembersResult`, and `OrganizationMembershipResult` were hand-written because the package had no exported alias for their schemas; types 0.4.0 exports one for every schema, so they are aliases now like the rest. The shapes are identical, so this is a no-op for adopters, and the dependency stays types-only.
