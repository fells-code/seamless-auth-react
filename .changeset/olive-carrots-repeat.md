---
'@seamless-auth/react': minor
---

Adopt `@seamless-auth/types` for the API request and response shapes. The SDK's types were hand-written and maintained in parallel with the auth API's schemas; they are now aliases of the published contract, so they cannot drift from what the API actually sends. The dependency is types-only, imported with `import type`, so no schema validation library reaches your bundle and the export names you import are unchanged.

Some types are now more accurate, which is a breaking change at the type level for adopters:

- `Credential.lastUsedAt` is `string | null | undefined`, not `Date | null`. The API serializes it as an ISO 8601 string, so code calling a `Date` method on it was relying on a type that never matched the wire value and threw at runtime. Wrap it yourself: `new Date(credential.lastUsedAt)`.
- `Credential.deviceType`, `friendlyName`, `platform`, `browser`, and `deviceInfo` are optional, matching the API. `Credential.createdAt` is now present.
- `User.phone` is `string | null`, and `User.roles` is required rather than optional. `User` also carries `lastLogin`.
- `Organization.createdAt` and `updatedAt` are `string` rather than `string | Date`.

No runtime behavior changes.
