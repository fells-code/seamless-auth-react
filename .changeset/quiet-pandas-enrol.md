---
'@seamless-auth/react': minor
---

Drop the naming step from the bundled passkey enrolment view.

Choosing "Register Passkey" (or "Use a security key instead") opened a modal asking for a
friendly name, and the browser's own passkey prompt only appeared once that form was
submitted. A user who came to the screen to press one button was handed a text field
first, at the point in the flow where they had the least idea what to type.

Registration now starts on the click. The credential still carries a `friendlyName`, and
the view fills it with the device the passkey was enrolled on (`mac • chrome`), which is
what the naming prompt suggested people write anyway. Renaming stays available through
`updateCredential`.

Nothing in the public API moves: `PasskeyMetadata.friendlyName` is unchanged and callers
building their own enrolment screen keep setting it themselves. Only the bundled
`/register-passkey` view changes, so an adopter relying on that screen to collect a name
needs their own screen for it.
