---
'@seamless-auth/react': patch
---

Fix magic-link verification so the tab that completes the link refreshes provider state and lands authenticated, instead of relying on another tab or a manual reload.
