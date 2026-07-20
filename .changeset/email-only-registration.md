---
'@seamless-auth/react': patch
---

The bundled registration screen now asks for an email only. It previously required a phone number as well, but registration only needs an email (the API treats phone as optional and it can be added and verified later), so the field was a mismatch that blocked email-only sign-up.

`RegisterInput.phone` is now optional (`phone?: string | null`) and is only sent when a caller provides one, so headless consumers can still submit a phone at registration if they want to.
