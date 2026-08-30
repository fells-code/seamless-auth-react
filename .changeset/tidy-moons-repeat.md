---
'@seamless-auth/react': minor
---

`registerPasskey()` accepts an `attachment`, so a caller can ask for a roaming
authenticator (`cross-platform`, a USB or NFC security key) or the one built
into the device (`platform`) instead of leaving the choice to the browser's
picker. The bundled enrolment view offers a "Use a security key instead" control
that takes this path, and explains a policy refusal rather than showing a
generic failure.

Omitting the option sends no query parameter, so the deployment's
`authenticator_policy.attachment` stays in charge and current behaviour is
unchanged. It is a request rather than an override: a deployment that pins the
other kind refuses the registration with `attachment_not_allowed`, which
`getPasskeyPolicyErrorCode()` reads.

`PasskeyAttachment` is exported, and is derived from the deployment policy type
in `@seamless-auth/types` rather than restating its members.
