---
'@seamless-auth/react': patch
---

The README's Next.js example reads the service token from `SEAMLESS_SERVICE_TOKEN` instead of `API_SERVICE_TOKEN`. The auth server still reads `API_SERVICE_TOKEN`; both hold the same value.
