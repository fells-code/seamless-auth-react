---
'@seamless-auth/react': patch
---

Take role matching from `@seamless-auth/types` instead of reimplementing it. `hasScopedRole()` and `roleGrantsAccess()` now re-export the package's Zod-free `role/matching` entry point, so the SDK enforces the same rules as the API and the other clients rather than a client-side copy that could drift. Behavior is unchanged: the two implementations were compared across every combination of a generated role corpus before the swap, and the existing tests now cover the shared implementation. No validation library enters the bundle.
