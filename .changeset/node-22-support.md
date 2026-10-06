---
'@seamless-auth/client': patch
'@seamless-auth/react': patch
'@seamless-auth/react-native': patch
---

Support Node 22 and newer. The `engines` field now requires `>=22` instead of `>=24.0.0 <25.0.0`, and CI runs on Node 22, 24, and the latest release (fells-code/seamless-auth-api#339).
