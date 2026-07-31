---
'@seamless-auth/react': minor
---

Offer a way past passkey registration when another login method is enabled.

Registration used to end on a screen with one control on it. A user who did not want a passkey, or
whose device could not make one, had no way forward: the unsupported branch rendered a message and
nothing else, on a screen with no exit. The session already exists by then, since the OTP step that
leads here establishes it, so leaving without a passkey was always a legitimate way to finish.

`useLoginMethods` reads the instance configuration from the auth server, and the skip only appears
when a method other than `passkey` is enabled. With passkey as the only method a skip would leave a
user unable to sign back into the account they just created, so the control is not rendered at all.
Unknown counts as unsafe: a failed or in-flight read shows no skip rather than guessing.

The unsupported-device branch now says which case it is, and offers the same way forward when one
exists.

`Login` no longer starts from a hardcoded `['passkey', 'magic_link', 'phone_otp']`. It uses the
methods the instance reports, falling back to the narrower `['passkey', 'magic_link']` that matches
the auth server's own defaults. The login response stays authoritative when it carries methods of
its own.

Requires an auth server serving `GET /system-config/public`, and an adapter that proxies it.
