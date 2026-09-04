---
'@seamless-auth/react': minor
---

Stop painting the disabled submit button as a filled grey primary.

On the sign-in and MFA screens the submit button was disabled until its field
validated, and while disabled it was filled with `--seamless-disabled` while the
label kept `--seamless-accent-contrast`. Those two colours were chosen in
different places, so no value a themed app could supply worked in both a light
and a dark theme: lighten the fill and the label washed out, darken it and the
label went near-black on dark. The result read as a primary button that had
broken rather than a control waiting on input.

The disabled state is now the enabled button at reduced opacity. Label and
background stay on the accent pair the app already tuned, so their contrast
cannot invert with the theme, and the control reads as inactive instead of
broken. This matches how the magic-link and passkey screens already draw their
disabled buttons.

`--seamless-disabled` is no longer read anywhere and has been dropped from the
token table. If you set it, remove it; every other token behaves as before.

The sign-in screen now also says why the button is refusing, in a live region
below it that reports whether the field is empty, incomplete, or ready. A
disabled button is not focusable and is passed over by screen readers, so the
refusal was previously silent for the people least able to guess the reason.

Fixing that surfaced a related bug: a valid email typed in registration left the
Login button enabled after switching to sign-in, even with the identifier field
empty, because the submit check fell through to the registration field. Each
mode now checks only its own field.
