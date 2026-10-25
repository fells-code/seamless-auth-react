---
'@seamless-auth/react': patch
---

The bundled magic link and OAuth callback screens now remove the `token`, `code` and `state` from the address bar once they have read them, replacing the history entry, so the one-time values no longer stay in browser history or travel in a `Referer`. The Vue, Angular and Svelte screens already did this.
