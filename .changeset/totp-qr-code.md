---
'@seamless-auth/client': minor
---

Adds `qrCode(text)`, which turns the `otpauth://` URL from authenticator app enrollment into a QR code a phone camera can scan, with no extra dependency. It returns the symbol's `size` in modules (quiet zone included) and SVG `path` data, so any binding can render it as `<svg viewBox="0 0 {size} {size}"><path d="{path}" /></svg>`. It throws a `RangeError` for text too long for a QR code. `qrMatrix(text)` returns the raw module grid for custom rendering.
