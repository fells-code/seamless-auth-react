# @seamless-auth/react

[![npm version](https://img.shields.io/npm/v/@seamless-auth/react.svg?label=%40seamless-auth%2Freact)](https://www.npmjs.com/package/@seamless-auth/react)
[![CI](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml/badge.svg)](https://github.com/fells-code/seamless-auth-react/actions/workflows/ci.yml)
[![Release](https://github.com/fells-code/seamless-auth-react/actions/workflows/release.yml/badge.svg)](https://github.com/fells-code/seamless-auth-react/actions/workflows/release.yml)
[![coverage](https://img.shields.io/codecov/c/github/fells-code/seamless-auth-react)](https://app.codecov.io/gh/fells-code/seamless-auth-react)
[![license](https://img.shields.io/github/license/fells-code/seamless-auth-react)](./LICENSE)

`@seamless-auth/react` is a React SDK for Seamless Auth. It gives you a provider for auth state, a headless client and hooks for custom auth UIs, and optional prebuilt auth routes when you want a faster drop-in flow.

## What It Exports

- `AuthProvider`
- `AuthRoutes`
- `useAuth()`
- `createSeamlessAuthClient()`
- `useAuthClient()`
- `usePasskeySupport()`
- `hasScopedRole()` and `roleGrantsAccess()`
- types including `AuthContextType`, `Credential`, `User`, `OAuthProvider`, `StepUpStatus`, and the headless client input/result types

## Installation

```bash
npm install @seamless-auth/react
```

## Releases

Published versions are listed in [CHANGELOG.md](./CHANGELOG.md) and GitHub Releases. Releases are
managed with Changesets: adopter-facing changes include a changeset, the `Release` workflow opens a
version PR for review, and merging that PR publishes the npm package with provenance from GitHub
Actions. See [RELEASES.md](./RELEASES.md) for maintainer release details.

## Choose Your Integration Style

You can use this package in three ways:

1. `AuthProvider` + `useAuth()` for auth state and core auth actions
2. `createSeamlessAuthClient()` or `useAuthClient()` to build fully custom login and registration screens
3. `AuthRoutes` when you want the built-in login, OTP, magic-link, and passkey screens

Most apps will use `AuthProvider` either way.

## Quick Start

### Wrap your app with `AuthProvider`

```tsx
import { AuthProvider } from '@seamless-auth/react';
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter>
  <AuthProvider apiHost="https://your.api">
    <AppRoutes />
  </AuthProvider>
</BrowserRouter>;
```

### Read auth state with `useAuth()`

```tsx
import { useAuth } from '@seamless-auth/react';

function Dashboard() {
  const { user, logout, refreshSession } = useAuth();

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <button onClick={() => void refreshSession()}>Refresh session</button>
      <button onClick={() => void logout()}>Logout</button>
    </div>
  );
}
```

### Use built-in auth routes with `AuthRoutes`

```tsx
import { AuthRoutes, useAuth } from '@seamless-auth/react';
import { Route, Routes } from 'react-router-dom';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {isAuthenticated ? (
        <Route path="*" element={<Dashboard />} />
      ) : (
        <Route path="*" element={<AuthRoutes />} />
      )}
    </Routes>
  );
}
```

You are still responsible for your app’s route protection and redirects.

## `useAuth()` API

`useAuth()` returns the current auth state plus the provider-backed helpers:

```ts
{
  user: User | null;
  credentials: Credential[];
  stepUpStatus: StepUpStatus | null;
  isAuthenticated: boolean;
  loading: boolean;
  apiHost: string;
  hasSignedInBefore: boolean;
  markSignedIn(): void;
  hasRole(role: string): boolean | undefined;
  hasScopedRole(role: string | string[]): boolean | undefined;
  listOAuthProviders(): Promise<OAuthProvidersResult>;
  startOAuthLogin(input: StartOAuthLoginInput): Promise<StartOAuthLoginResult>;
  finishOAuthLogin(input: FinishOAuthLoginInput): Promise<void>;
  refreshSession(): Promise<void>;
  refreshStepUpStatus(): Promise<StepUpStatus | null>;
  verifyStepUpWithPasskey(): Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskeyPrf(input: PasskeyPrfInput): Promise<SeamlessAuthResult<StepUpPrfData>>;
  verifyStepUpWithTotp(code: string): Promise<SeamlessAuthResult<StepUpStatus>>;
  logout(): Promise<void>;
  logoutAllSessions(): Promise<void>;
  deleteUser(): Promise<void>;
  login(identifier: string, passkeyAvailable: boolean): Promise<SeamlessAuthResult<LoginStartResult>>;
  handlePasskeyLogin(): Promise<boolean>;
  updateCredential(credential: Credential): Promise<Credential>;
  deleteCredential(credentialId: string): Promise<void>;
}
```

Use `refreshSession()` after completing a custom auth flow that should update provider state.

### `hasSignedInBefore`

`hasSignedInBefore` is a small convenience flag backed by `localStorage`. The provider reads the `seamlessauth_seen` key on load and sets the flag to `true` after `markSignedIn()` runs.

This is mainly useful for login UIs that want to branch between first-time and returning-user behavior. For example, the built-in `Login` view uses it to default returning users to sign-in mode instead of registration.

```tsx
import { useAuth } from '@seamless-auth/react';

function SignInHint() {
  const { hasSignedInBefore } = useAuth();

  return hasSignedInBefore ? (
    <p>Welcome back. Sign in with your email, phone, or passkey.</p>
  ) : (
    <p>New here? Start by creating your account.</p>
  );
}
```

If you are building a fully custom flow, call `markSignedIn()` after a successful sign-in or registration step once you want future visits treated as returning-user sessions.

```tsx
const { markSignedIn, refreshSession } = useAuth();

async function completeLogin() {
  const { error } = await authClient.login({
    identifier: 'user@example.com',
    passkeyAvailable: true,
  });

  if (!error) {
    markSignedIn();
    await refreshSession();
  }
}
```

To disable this auto-detection entirely, pass `autoDetectPreviousSignin={false}` to `AuthProvider`.

### Scoped roles

`hasRole(role)` remains an exact role check. Use `hasScopedRole(role)` for colon-separated scoped
roles such as `admin:read` and `admin:write`.

```tsx
const { hasRole, hasScopedRole } = useAuth();

hasRole('admin'); // exact legacy role check
hasScopedRole('admin:read'); // true for admin, admin:read, or admin:write
hasScopedRole('admin:write'); // true for admin or admin:write
```

The package also exports standalone `hasScopedRole(roles, required)` and `roleGrantsAccess(...)`
helpers for code that is not inside `AuthProvider`.

### Step-up authentication

Use step-up authentication before sensitive actions that should require a fresh user verification, such as deleting an account, changing MFA settings, or viewing recovery material.

```tsx
import { useAuth } from '@seamless-auth/react';

function DeleteAccountButton() {
  const { refreshStepUpStatus, verifyStepUpWithPasskey } = useAuth();

  async function handleDeleteAccount() {
    const status = await refreshStepUpStatus();
    const fresh = status?.fresh ? true : !(await verifyStepUpWithPasskey()).error;

    if (!fresh) {
      return;
    }

    await deleteAccount();
  }

  return <button onClick={() => void handleDeleteAccount()}>Delete account</button>;
}
```

Step-up supports WebAuthn/passkeys and TOTP (authenticator apps). `refreshStepUpStatus()` calls `/step-up/status`, `verifyStepUpWithPasskey()` performs the `/step-up/webauthn/start` and `/step-up/webauthn/finish` challenge flow, and `verifyStepUpWithTotp(code)` verifies a 6-digit authenticator code via `/totp/verify-mfa`. The verification helpers return a `SeamlessAuthResult<StepUpStatus>` and refresh the provider's `stepUpStatus` when they succeed.

```tsx
const { verifyStepUpWithTotp } = useAuth();

const { error } = await verifyStepUpWithTotp('123456'); // 6-digit code from the authenticator app
if (!error) {
  // step-up is fresh; proceed with the sensitive action
}
```

### TOTP (authenticator apps)

TOTP lets users register an authenticator app (Google Authenticator, 1Password, etc.) as a second factor for step-up verification. The SDK exposes headless client methods for enrollment and management; use them from a settings screen. All require an authenticated session.

```ts
import { createSeamlessAuthClient } from '@seamless-auth/react';
import type { TotpStatus, TotpEnrollmentStartResult } from '@seamless-auth/react';

const authClient = createSeamlessAuthClient({ apiHost: 'https://your.api' });

// 1. Check whether TOTP is already enabled
const { data: status } = await authClient.getTotpStatus();

// 2. Start enrollment: render `otpauthUrl` as a QR code (or show `secret` for manual entry)
const { data: enrollment } = await authClient.startTotpEnrollment();

// 3. Confirm the first code from the user's authenticator app
const { error } = await authClient.verifyTotpEnrollment('123456');
if (!error) {
  // TOTP is now enabled
}

// Disabling requires a current code
await authClient.disableTotp('123456');
```

These methods follow the standard result convention: check `error`, then read `data`. Enrolling TOTP is a sensitive change; gate it behind a fresh step-up when appropriate.

> TOTP is not currently a login second factor. The Seamless Auth API issues a full session on the first factor and does not gate login on TOTP, so TOTP applies to step-up verification, not to the login flow.

### WebAuthn PRF

WebAuthn PRF lets a compatible passkey and browser derive local key material during a WebAuthn assertion. Seamless Auth verifies the passkey assertion on the server, while the React SDK returns the PRF output only to the browser caller. PRF output is stripped before `/webAuthn/login/finish` and `/step-up/webauthn/finish`, and should never be logged, stored, or sent to your API.

Browser and authenticator support is not universal. Call `isPasskeyPrfSupported()` before offering PRF-required flows, and keep a fallback for passkeys that authenticate successfully without returning PRF output.

Treat PRF salts as sensitive in client logs. PRF output is browser-local key material; keep it in
memory only as long as your application needs it and do not send it to Seamless Auth or your own API.

```ts
import { createSeamlessAuthClient } from '@seamless-auth/react';

const authClient = createSeamlessAuthClient({
  apiHost: 'https://your.api',
});

const prfSupported = await authClient.isPasskeyPrfSupported();

if (prfSupported) {
  await authClient.registerPasskey({
    metadata: {
      friendlyName: 'My laptop',
      platform: 'macOS',
      browser: 'Chrome',
      deviceInfo: navigator.userAgent,
    },
    requirePrf: true,
  });
}
```

For local key unwrap flows such as Seamless Secrets, use PRF during step-up and consume the returned bytes in browser memory:

```ts
const { data, error } = await authClient.verifyStepUpWithPasskeyPrf({
  salt: vaultSaltBase64url,
  credentialId,
});

if (error) {
  throw error;
}

const vaultUnlockMaterial: { credentialId: string; output: Uint8Array } = {
  credentialId: data.credentialId,
  output: data.prf.output,
};
```

The salt may be an `ArrayBuffer`, `ArrayBufferView`, or base64url string. Authentication proves identity and user presence; the PRF output is local key material for your application to use without sending it to Seamless Auth.

### OAuth Login

OAuth lets your app offer external identity providers such as Google, GitHub, Facebook, or custom
OIDC-style providers configured on the Seamless Auth API. The React SDK does not receive provider
access tokens. It only starts the provider redirect and completes the callback so Seamless Auth can
issue the normal access/refresh session.

Use `listOAuthProviders()` when you want to render enabled providers dynamically:

```tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@seamless-auth/react';
import type { OAuthProvider } from '@seamless-auth/react';

function OAuthButtons() {
  const { listOAuthProviders, startOAuthLogin } = useAuth();
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    void listOAuthProviders().then(result => setProviders(result.providers));
  }, [listOAuthProviders]);

  async function signIn(providerId: string) {
    const result = await startOAuthLogin({
      providerId,
      redirectUri: `${window.location.origin}/oauth/callback`,
      returnTo: `${window.location.origin}/dashboard`,
    });

    window.location.assign(result.authorizationUrl);
  }

  return (
    <div>
      {providers.map(provider => (
        <button key={provider.id} onClick={() => void signIn(provider.id)}>
          Continue with {provider.name}
        </button>
      ))}
    </div>
  );
}
```

Create a callback route that reads the provider query params and asks Seamless Auth to complete the
login:

```tsx
import { useEffect } from 'react';
import { useAuth } from '@seamless-auth/react';

function OAuthCallback() {
  const { finishOAuthLogin } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Persist the provider you passed to startOAuthLogin so the callback knows
    // which provider to finish. The built-in AuthRoutes flow stores this in
    // sessionStorage; use whatever your custom start flow saved.
    const providerId = sessionStorage.getItem('seamless:oauth:provider');
    const code = params.get('code');
    const state = params.get('state');

    if (!providerId || !code || !state) {
      return;
    }

    void finishOAuthLogin({ providerId, code, state }).then(() => {
      window.location.assign('/dashboard');
    });
  }, [finishOAuthLogin]);

  return <p>Finishing sign-in...</p>;
}
```

For fully custom UI without `useAuth()`, call the headless client directly:

```ts
const providers = await authClient.listOAuthProviders();
const started = await authClient.startOAuthLogin({
  providerId: providers.providers[0].id,
  redirectUri: `${window.location.origin}/oauth/callback`,
});

window.location.assign(started.authorizationUrl);
```

OAuth must be enabled on the Seamless Auth API with `LOGIN_METHODS` including `oauth` and at least
one configured `oauth_providers` entry. Provider client secrets live on the server and are referenced
by environment variable name; they are never passed through this SDK.

For production providers, configure exact `redirectUris` on the Seamless Auth API. The SDK should
send the callback URL it expects to receive, but redirect allowlisting, signed state expiry, OIDC
nonce handling, email verification policy, and account-linking policy are enforced by the API.

The built-in views avoid logging OTPs, magic-link tokens, bootstrap tokens, PRF salts, or raw
exception payloads that may contain sensitive request URLs.

## Headless Client

For custom auth UIs, use the exported client directly:

```ts
import { createSeamlessAuthClient } from '@seamless-auth/react';

const authClient = createSeamlessAuthClient({
  apiHost: 'https://your.api',
});

const { data, error } = await authClient.login({
  identifier: 'user@example.com',
  passkeyAvailable: true,
});

if (error) {
  // error.message, error.status, and error.body carry the server detail
  return;
}

// data is typed as LoginStartResult
console.log(data.loginMethods);
```

The headless client exposes helpers for:

- current-user/session lookup
- login and passkey login
- registration
- phone OTP and email OTP
- magic-link request, verify, and polling
- OAuth provider listing, start, and callback completion
- passkey registration
- step-up status, passkey verification, and TOTP verification
- TOTP enrollment, status, and disable
- logout and delete-user
- credential update and deletion

### Result convention

Every request method resolves to a `SeamlessAuthResult<T>`:

```ts
type SeamlessAuthResult<T> =
  | { data: T; error: null }
  | { data: null; error: SeamlessAuthError };
```

Check `error` first, then read `data`. TypeScript enforces this: `data` is not readable until the
error has been ruled out.

```ts
const { data, error } = await authClient.getCurrentUser();

if (error) {
  console.log(error.message, error.status, error.body);
  return;
}

setUser(data.user); // typed as CurrentUserResult
```

Nothing throws for an HTTP failure, and transport failures are absorbed too, reported as an error
with `status` `0`. That means an expected auth outcome such as a wrong OTP, an expired magic link, or
a disabled provider is a value you can map straight to UI state rather than an exception to catch.

`SeamlessAuthError` carries the server's `message`, the HTTP `status`, and the parsed response
`body`, so you can branch on a specific failure.

The single exception is `isPasskeySupported`-style capability checks:
`isPasskeyPrfSupported(): Promise<boolean>` is a local check rather than a request, so it returns a
plain boolean.

## React Hooks For Custom UI

If you want custom React screens but do not want to manually recreate the client, use the exported hooks:

```tsx
import { useAuth, useAuthClient, usePasskeySupport } from '@seamless-auth/react';

function CustomLogin() {
  const { refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported, loading } = usePasskeySupport();

  async function handleEmailLogin() {
    const { error } = await authClient.login({
      identifier: 'user@example.com',
      passkeyAvailable: passkeySupported,
    });

    if (!error) {
      await refreshSession();
    }
  }

  return (
    <button disabled={loading} onClick={() => void handleEmailLogin()}>
      Sign in
    </button>
  );
}
```

### Two error styles, on purpose

The headless client and the provider helpers report failure differently:

- `useAuthClient()` and `createSeamlessAuthClient()` return `{ data, error }` and never throw.
- `useAuth()` helpers such as `updateCredential`, `deleteCredential`, `switchOrganization`,
  `finishOAuthLogin`, `listOAuthProviders`, and `startOAuthLogin` **throw** a `SeamlessAuthError`.

The provider helpers throw because they also mutate provider state, so there is no partial success to
hand back. Wrap those in `try`/`catch`, and check `error` on client calls.

## Custom UI Recipes

Worked examples for the flows the bundled screens cover, using only public primitives.

### Custom registration

Registration is two steps: create the account, then verify the emailed code. Call `markSignedIn()`
once the account is live so returning visits can default to sign-in.

```tsx
import { useAuth, useAuthClient } from '@seamless-auth/react';
import { useState } from 'react';

function CustomRegistration() {
  const { markSignedIn, refreshSession } = useAuth();
  const authClient = useAuthClient();
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [message, setMessage] = useState('');

  async function createAccount(email: string, phone: string) {
    const { error } = await authClient.register({ email, phone });

    if (error) {
      setMessage(error.message);
      return;
    }

    // The API emails a verification code as part of registering.
    setStep('verify');
  }

  async function verifyCode(code: string) {
    const { error } = await authClient.verifyEmailOtp(code);

    if (error) {
      setMessage(error.message);
      return;
    }

    markSignedIn();
    await refreshSession();
  }

  return step === 'details' ? (
    <DetailsForm onSubmit={createAccount} error={message} />
  ) : (
    <CodeForm
      onSubmit={verifyCode}
      onResend={() => authClient.requestEmailOtp()}
      error={message}
    />
  );
}
```

To offer a passkey right after registering, call `registerPasskey()` before `refreshSession()`:

```ts
const { data, error } = await authClient.registerPasskey({
  friendlyName: 'My laptop',
  platform: 'macOS',
  browser: 'Chrome',
  deviceInfo: navigator.userAgent,
});

if (!error) {
  console.log(data.credentialId, data.prfCapable);
}
```

### OTP and magic-link continuation

> **The request helpers take no identifier.** `requestMagicLink()`, `requestLoginEmailOtp()`, and
> `requestLoginPhoneOtp()` send nothing but the session cookie. They rely on server-side state
> established by a preceding `login()` call, so calling them without it fails or targets the wrong
> account. This is not obvious from their signatures. Always call `login()` first, and use the same
> browser session for the continuation step.

```tsx
function CustomLoginContinuation() {
  const { login, refreshSession } = useAuth();
  const authClient = useAuthClient();

  async function start(identifier: string) {
    // Required first: this is what the request helpers below depend on.
    const { data, error } = await login(identifier, false);

    if (error) {
      return;
    }

    // Offer only what the server says this account supports.
    return data.loginMethods ?? ['magic_link', 'email_otp'];
  }

  async function sendEmailCode() {
    const { error } = await authClient.requestLoginEmailOtp();
    if (error) {
      // surface error.message
    }
  }

  async function submitEmailCode(code: string) {
    const { error } = await authClient.verifyLoginEmailOtp(code);

    if (!error) {
      await refreshSession();
    }
  }
}
```

Magic links complete in whichever tab opens the emailed link, so a custom flow needs two pieces.

The waiting screen polls until the link is used:

```ts
const interval = setInterval(async () => {
  const { error } = await authClient.checkMagicLink();

  if (!error) {
    clearInterval(interval);
    await refreshSession();
  }
}, 5000);
```

The landing route verifies the token from the query string, then refreshes its own session:

```tsx
function CustomMagicLinkLanding() {
  const { refreshSession } = useAuth(); // plus: import { useEffect } from 'react'
  const authClient = useAuthClient();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return;

    void authClient.verifyMagicLink(token).then(async ({ error }) => {
      if (!error) {
        // Refresh here too. This tab set the cookie, but its provider state
        // was loaded before the cookie existed.
        await refreshSession();
      }
    });
  }, [authClient, refreshSession]);

  return <p>Finishing sign-in...</p>;
}
```

The auth API emails a link pointing at `/verify-magiclink?token=...`, so a custom app must serve that
path.

### Credential management

`useAuth()` exposes the signed-in user's passkeys plus helpers to rename and remove them. These
helpers update provider state and throw on failure.

```tsx
import { SeamlessAuthError, useAuth } from '@seamless-auth/react';
import type { Credential } from '@seamless-auth/react';
import { useState } from 'react';

function PasskeyList() {
  const { credentials, updateCredential, deleteCredential } = useAuth();
  const [message, setMessage] = useState('');

  async function rename(credential: Credential, friendlyName: string) {
    try {
      await updateCredential({ ...credential, friendlyName });
    } catch (error) {
      setMessage(error instanceof SeamlessAuthError ? error.message : 'Rename failed.');
    }
  }

  async function remove(credentialId: string) {
    try {
      await deleteCredential(credentialId);
    } catch (error) {
      setMessage(error instanceof SeamlessAuthError ? error.message : 'Removal failed.');
    }
  }

  return (
    <ul>
      {credentials.map(credential => (
        <li key={credential.id}>
          {credential.friendlyName ?? credential.deviceInfo}
          <button onClick={() => void rename(credential, 'Work laptop')}>Rename</button>
          <button onClick={() => void remove(credential.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
```

Removing a passkey is a sensitive change. Gate it behind a fresh step-up when the account has other
factors, using `refreshStepUpStatus()` and `verifyStepUpWithPasskey()` from the step-up section.

## Built-In Routes

`AuthRoutes` serves these canonical paths:

- `/login`
- `/passkey-login`
- `/verify-phone-otp`
- `/verify-email-otp`
- `/verify-magic-link`
- `/oauth/callback`
- `/register-passkey`
- `/magic-link-sent`

These are optional UI wrappers over the same SDK primitives the package now exports for custom flows.

### Renamed routes

The earlier mixed-case paths were renamed and are no longer served. Anything linking directly to
them now falls through to `/login`, so update those links:

| Old path           | New path            |
| ------------------ | ------------------- |
| `/passKeyLogin`    | `/passkey-login`    |
| `/verifyPhoneOTP`  | `/verify-phone-otp` |
| `/verifyEmailOTP`  | `/verify-email-otp` |
| `/registerPasskey` | `/register-passkey` |
| `/magiclinks-sent` | `/magic-link-sent`  |

Two paths are unchanged because they are owned by contracts outside this package:

- `/verify-magiclink` is the URL the auth API builds when it emails a magic link, so it has to match
  that value exactly. Renaming it here would send every emailed link to `/login` with the token
  discarded.
- `/oauth/callback` is registered with OAuth providers as an allowed redirect URI, so renaming it
  would break configured integrations.

## Backend Expectations

This package assumes a Seamless Auth-compatible backend with the auth adapter mounted at `/auth`.

- Requests target `${apiHost}/auth/...`
- `apiHost` may be provided with or without a trailing slash
- Requests are sent with `credentials: 'include'`
- `AuthProvider` validates the current session by calling `/users/me` on load

The built-in flows assume compatible endpoints for:

- `/login`
- `DELETE /logout` for the current session
- `DELETE /logout/all` for every session owned by the current user
- `/registration/register`
- `/webAuthn/login/start`
- `/webAuthn/login/finish`
- `/webAuthn/register/start`
- `/webAuthn/register/finish`
- `/otp/generate-phone-otp`
- `/otp/generate-email-otp`
- `/otp/verify-phone-otp`
- `/otp/verify-email-otp`
- `/otp/generate-login-phone-otp`
- `/otp/generate-login-email-otp`
- `/otp/verify-login-phone-otp`
- `/otp/verify-login-email-otp`
- `/magic-link`
- `/magic-link/check`
- `/magic-link/verify/:token`
- `/oauth/providers`
- `/oauth/:providerId/start`
- `/oauth/:providerId/callback`
- `/step-up/status`
- `/step-up/webauthn/start`
- `/step-up/webauthn/finish`
- `/totp/status`
- `/totp/enroll/start`
- `/totp/enroll/verify`
- `/totp/disable`
- `/totp/verify-mfa`
- `/users/me`
- `/users/credentials`
- `/users/delete`
- `/organizations`
- `/organizations/:organizationId`
- `/organizations/:organizationId/switch`
- `/organizations/:organizationId/members`
- `/organizations/:organizationId/members/:userId`

## Notes

- This package does not create its own `<BrowserRouter>`.
- It is designed to fit into your app’s existing routing tree.
- The quickest path is `AuthProvider` + `AuthRoutes`.
- The most flexible path is `AuthProvider` + custom UI using `useAuth()`, `useAuthClient()`, and `usePasskeySupport()`.

## License

AGPL-3.0-only
