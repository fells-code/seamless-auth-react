---
'@seamless-auth/client': minor
'@seamless-auth/react': minor
---

Put the platform behind ports, and add a bearer transport with token custody to the client core.

The client spoke one contract: cookies to a server adapter at `/auth`, with the browser's WebAuthn
API and `window.location` reached directly. A native binding has none of those, so the pieces that
differ by platform are now ports a binding supplies, with the browser implementations as the
defaults. A web application configures nothing and behaves exactly as before.

- `transport` on `createSeamlessAuthClient` (and `AuthProvider`): cookie transport is unchanged;
  `{ mode: 'bearer', tokenStorage }` makes the client hold the auth API's own tokens. Every request
  carries `x-seamless-auth-transport: bearer`; pre-auth routes carry the ephemeral token that
  `/login` or `/registration/register` returned, kept in memory only; signed-in routes carry the
  access token; the pair a sign-in returns is written through a `TokenStoragePort`; a 401 on a
  signed-in route triggers one `POST /refresh` and one retry, with at most one refresh in flight
  because the auth API revokes the chain on a replayed refresh token. Which routes take which
  token is one table, mirroring the server adapter's, rather than an annotation at each of the
  forty call sites.
- `PasskeyPort` (`isSupported`, `isPlatformAuthenticatorAvailable`, `create`, `get`) replaces the
  direct SimpleWebAuthn calls at the four ceremony sites. `createBrowserPasskeyPort()` is the
  default. A port reports an authenticator refusal with `PasskeyCeremonyError`, or any error with a
  DOMException `name` and a string `code`, which the client turns into the same result a browser
  failure gave. The PRF helpers no longer depend on SimpleWebAuthn at runtime.
- `OAuthRedirectPort` replaces `window.location.assign` in the built-in provider buttons.
  `createBrowserOAuthRedirect()` is the default; a port that receives the callback itself resolves
  with `code` and `state`, and the buttons finish the login on the spot.
- `TokenStoragePort` with `createMemoryTokenStorage()`.
- `createAuthSession` accepts the client options (or a ready-made `client`) and exposes the client
  it drives as `session.client`. `useAuthClient()` returns that same instance rather than building a
  second one, which bearer transport needs: the client holds the sign-in in flight.
- `AuthProvider` gains `transport` and `ports` props and exposes `client` and `ports` on the
  context. `usePasskeySupport()` reads the passkey port.

Tracks fells-code/seamless-auth-react#124, #125, #127 and #128.
