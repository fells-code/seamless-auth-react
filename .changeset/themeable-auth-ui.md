---
'@seamless-auth/react': minor
---

feat(styles): make the built-in auth UI themeable with CSS custom properties

Every colour in the bundled screens now reads from a `--seamless-*` custom property with the previous
literal as its fallback, so consumers can match the auth UI to their brand by setting variables on
`:root` or on any ancestor of `<AuthRoutes />`.

This is opt-in and non-breaking. Applications that set nothing render exactly as before.
