---
'@seamless-auth/react': patch
---

Improve request hygiene in the shared auth fetch helper. It no longer sends a JSON `Content-Type` on bodyless requests (some proxies reject a GET that advertises a request content type), and it no longer logs a `console.warn` on every non-ok response. Callers already inspect `response.ok`, and caller-provided headers still take precedence.
