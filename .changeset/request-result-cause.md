---
'@seamless-auth/client': patch
---

A client method whose request throws now keeps the thrown error as `error.cause`. Every such failure used to arrive as the same status `0` error with nothing to tell them apart, so an app could not distinguish an `UntrustedOriginError`, an `UntrustedRedirectError` or a refused refresh from a network failure. Check `error.cause instanceof UntrustedRedirectError` (or another error class) to show a more specific message. The `message` and `status` are unchanged.
