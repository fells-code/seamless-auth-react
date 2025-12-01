# Seamless Auth React

# @seamless-auth/react

[![npm version](https://img.shields.io/npm/v/@seamless-auth/react.svg?label=%40seamless-auth%2Freact)](https://www.npmjs.com/package/@seamless-auth/react)
[![build](https://github.com/fells-code/seamless-auth-react/actions/workflows/release.yml/badge.svg)](https://github.com/fells-code/seamless-auth-react/actions/workflows/release.yml)
[![coverage](https://img.shields.io/codecov/c/github/fells-code/seamless-auth-react)](https://app.codecov.io/gh/fells-code/seamless-auth-react)
[![license](https://img.shields.io/github/license/fells-code/seamless-auth-react)](./LICENSE)

A drop-in authentication provider for React applications, designed to handle login, multi-factor authentication, passkeys, and user session validation using your own backend.

## Features

- Provides `AuthProvider` context
- Includes `useAuth()` hook for access to auth state and actions
- Ships with pre-built login, MFA, and passkey routes
- Lets consumer apps handle routing via `react-router-dom`
- Supports automatic session validation on load

---

## Installation

```bash
npm install seamless-auth-react
```

---

## Usage

### 1. Wrap your app with `AuthProvider`

```tsx
import { AuthProvider } from 'seamless-auth-react';
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter>
  <AuthProvider apiHost="https://your.api/">
    <AppRoutes />
  </AuthProvider>
</BrowserRouter>;
```

### 2. Use `useAuth()` to access auth state

```tsx
import { useAuth } from 'seamless-auth-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div>
      Welcome, {user?.email}
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### 3. Use `<AuthRoutes />` for handling login/mfa/passkey screens

```tsx
import { Routes, Route } from 'react-router-dom';
import { useAuth, AuthRoutes } from 'seamless-auth-react';

const AppRoutes = () => {
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
};
```

> Note: You are responsible for handling route protection and redirects based on `isAuthenticated`.

---

## AuthContext API

### `useAuth()` returns:

```ts
{
  user: { email: string, roles?: string[] } | null;
  isAuthenticated: boolean;
  logout(): Promise<void>;
  deleteUser(): Promise<void>;
  hasRole(role: string): boolean | undefined;
}
```

---

## Auth Routes Included

- `/login`
- `/mfaLogin`
- `/passKeyLogin`
- `/registerPasskey`
- `/verifyOTP`

Each route includes a pre-built UI and expects your backend to expose compatible endpoints.

---

## Customization

You can override the included UI screens by:

- Copying the component source from the package
- Creating your own version
- Replacing the component in your app

---

## Notes

- This package **does not** create its own `<BrowserRouter>` or `<Routes>`.
- It is designed to be fully compatible with your existing routing tree.
- The `AuthProvider` automatically calls `/users/me` on load to validate session.

---

## License

MIT
