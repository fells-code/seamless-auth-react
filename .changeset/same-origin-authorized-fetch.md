---
'@seamless-auth/client': patch
---

`authorizedFetch` works again for an app that serves `/auth` on its own origin (`apiHost: ""`, as `<AuthProvider apiHost="">`). Since 0.5.0 it refused every path in that setup with `UntrustedOriginError`, because a path stayed relative and the origin check could not read an origin from it. A path now resolves on the page's own origin, which is trusted. Without a page (server rendering, React Native) an empty `apiHost` still sends nothing.
