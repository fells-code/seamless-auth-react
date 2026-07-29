---
'@seamless-auth/react': patch
---

Stop calling the logout endpoint when the session check fails. A failed `/users/me` means the server already considers the session unusable, so the SDK now clears it locally instead of sending a `DELETE /logout` for a session that does not exist. Previously every anonymous page load fired that second request.

Session state now lives in a framework-agnostic store behind `AuthProvider`, which reads it through `useSyncExternalStore`. The provider's public API is unchanged. Reading a previous sign-in goes through a storage port that falls back to memory when there is no `localStorage`, so the store is safe to create during server-side rendering.

The store survives a remount. React can run mount, cleanup, mount against the same provider, which StrictMode does on every mount and Activity does whenever a hidden tree is shown again, so the provider no longer destroys the store from its effect cleanup. `destroy()` is terminal, and tearing it down there left the remounted provider holding a store that refused every update and stayed on `loading: true`.
