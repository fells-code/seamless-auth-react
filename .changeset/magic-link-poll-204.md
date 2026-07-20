---
'@seamless-auth/react': patch
---

Fix the magic-link waiting screen treating an unused link as completed. The poll endpoint answers `204` with no body until the emailed link is consumed, so checking only for a non-error response redirected on the first poll, before the user clicked the link. It now waits for the endpoint to report success.
