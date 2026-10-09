---
'@seamless-auth/angular': patch
---

`requireAuth` now treats a server render without `initialSession` as signed out and redirects to `loginPath`, instead of admitting, so a protected page's data never renders into a response for a visitor the server could not identify. The browser decides again when the application boots. The OAuth callback and passkey enrolment screens no longer add the base href twice to the destination, and enrolment without a handed-over destination now goes to `signedInPath`. A guard waiting on the session no longer hangs if the application is destroyed first, and the stylesheet export is marked as a side effect so bundlers keep `import '@seamless-auth/angular/seamless-auth.css'`.
