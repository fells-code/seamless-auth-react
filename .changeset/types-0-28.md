---
'@seamless-auth/client': patch
'@seamless-auth/react': patch
'@seamless-auth/react-native': patch
---

Depend on `@seamless-auth/types` `^0.28.0` (was `^0.26.0`), so the SDK's wire types track the current auth API contract. No SDK request or response shape changes; 0.27.0 and 0.28.0 only add admin system config and dashboard metrics fields.
