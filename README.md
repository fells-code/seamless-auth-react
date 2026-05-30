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
created automatically from release-eligible Conventional Commits merged to `main`, then published to
npm with provenance from GitHub Actions.

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
  verifyStepUpWithPasskey(): Promise<StepUpVerificationResult>;
  verifyStepUpWithPasskeyPrf(input: PasskeyPrfInput): Promise<StepUpWithPasskeyPrfResult>;
  logout(): Promise<void>;
  logoutAllSessions(): Promise<void>;
  deleteUser(): Promise<void>;
  login(identifier: string, passkeyAvailable: boolean): Promise<Response>;
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
  const response = await authClient.login({
    identifier: 'user@example.com',
    passkeyAvailable: true,
  });

  if (response.ok) {
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
    const fresh = status?.fresh ? true : (await verifyStepUpWithPasskey()).success;

    if (!fresh) {
      return;
    }

    await deleteAccount();
  }

  return <button onClick={() => void handleDeleteAccount()}>Delete account</button>;
}
```

The current step-up backend supports WebAuthn/passkeys. `refreshStepUpStatus()` calls `/step-up/status`, and `verifyStepUpWithPasskey()` performs the `/step-up/webauthn/start` and `/step-up/webauthn/finish` challenge flow.

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
const result = await authClient.verifyStepUpWithPasskeyPrf({
  salt: vaultSaltBase64url,
  credentialId,
});

if (!result.success || !result.prf) {
  throw new Error('PRF step-up failed');
}

const vaultUnlockMaterial: { credentialId: string; output: Uint8Array } = {
  credentialId: result.credentialId!,
  output: result.prf.output,
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
    const providerId = 'google';
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
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

const response = await authClient.login({
  identifier: 'user@example.com',
  passkeyAvailable: true,
});

if (response.ok) {
  // Continue your custom flow
}
```

The headless client exposes helpers for:

- current-user/session lookup
- login and passkey login
- registration
- phone OTP and email OTP
- magic-link request, verify, and polling
- OAuth provider listing, start, and callback completion
- passkey registration
- step-up status and passkey verification
- logout and delete-user
- credential update and deletion

Client methods return raw `Response` objects except for the passkey convenience helpers:

- `loginWithPasskey(options?: PasskeyLoginOptions): Promise<PasskeyLoginWithPrfResult>`
- `registerPasskey(metadata | { metadata, requestPrf?, requirePrf? }): Promise<PasskeyRegistrationResult>`
- `isPasskeyPrfSupported(): Promise<boolean>`
- `verifyStepUpWithPasskey(): Promise<StepUpVerificationResult>`
- `verifyStepUpWithPasskeyPrf(input): Promise<StepUpWithPasskeyPrfResult>`
- `listOAuthProviders(): Promise<OAuthProvidersResult>`
- `startOAuthLogin(input): Promise<StartOAuthLoginResult>`
- `finishOAuthLogin(input): Promise<Response>`

## React Hooks For Custom UI

If you want custom React screens but do not want to manually recreate the client, use the exported hooks:

```tsx
import { useAuth, useAuthClient, usePasskeySupport } from '@seamless-auth/react';

function CustomLogin() {
  const { refreshSession } = useAuth();
  const authClient = useAuthClient();
  const { passkeySupported, loading } = usePasskeySupport();

  async function handleEmailLogin() {
    const response = await authClient.login({
      identifier: 'user@example.com',
      passkeyAvailable: passkeySupported,
    });

    if (response.ok) {
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

## Built-In Routes

`AuthRoutes` currently includes:

- `/login`
- `/passKeyLogin`
- `/verifyPhoneOTP`
- `/verifyEmailOTP`
- `/verify-magiclink`
- `/registerPasskey`
- `/magiclinks-sent`

These are optional UI wrappers over the same SDK primitives the package now exports for custom flows.

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
- `/magic-link`
- `/magic-link/check`
- `/magic-link/verify/:token`
- `/oauth/providers`
- `/oauth/:providerId/start`
- `/oauth/:providerId/callback`
- `/step-up/status`
- `/step-up/webauthn/start`
- `/step-up/webauthn/finish`
- `/users/me`
- `/users/credentials`
- `/users/delete`

## Notes

- This package does not create its own `<BrowserRouter>`.
- It is designed to fit into your app’s existing routing tree.
- The quickest path is `AuthProvider` + `AuthRoutes`.
- The most flexible path is `AuthProvider` + custom UI using `useAuth()`, `useAuthClient()`, and `usePasskeySupport()`.

## License

AGPL-3.0-only
