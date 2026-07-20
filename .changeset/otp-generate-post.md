---
'@seamless-auth/react': minor
---

Request OTP generation over `POST` instead of `GET`.

`requestPhoneOtp`, `requestEmailOtp`, `requestLoginPhoneOtp`, and `requestLoginEmailOtp` each caused an SMS or email to be sent, so they were state changing. Sent as a `GET`, they were simple cross-site requests, so an `<img src>` on any page could trigger unbounded OTP messages to a signed-in user. They now POST an empty JSON body, which forces a CORS preflight and closes the vector. This mirrors the `requestMagicLink` change.

BREAKING: this requires an adapter serving these routes over POST (`@seamless-auth/express` with the OTP POST change, released alongside this). Against an older adapter the four request methods get a 404. Callers need no code change.
