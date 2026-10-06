---
'@seamless-auth/react': patch
---

Fix the bundled magic-link screen (`/verify-magiclink`) under React Strict Mode. Strict Mode runs effects twice in development, and the screen sent the single-use link to the server twice: the first request consumed it, the second was refused, and the screen showed "Failed to verify token" for a link that worked. It now sends one request per link.

The screen also no longer assumes that verifying a link signs in the tab that opened it. The session belongs to the browser that requested the link. After verifying, the screen signs in when the link was opened in that same browser, and otherwise tells the reader to return to the device that asked.
