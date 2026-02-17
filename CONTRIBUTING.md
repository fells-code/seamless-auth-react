# Contributing to Seamless Auth

Thank you for contributing to Seamless Auth.

## Philosophy

Seamless Auth is:

- Passwordless-first
- Security-focused
- Minimal and intentional
- Infrastructure-grade software

## Before You Start

For non-trivial changes:

1. Open an issue first
2. Explain the motivation
3. Describe your proposed solution
4. Wait for feedback

## Development Setup (React SDK)

The React SDK is developed against a real Seamless Auth server instance.

Contributors must run the local Seamless Auth server while developing changes to this package.

---

## 1. Fork and Clone

Fork the repository and clone it locally:

```bash
# Clone the auth server code or your forks
git clone https://github.com/fells-code/seamless-auth-api.git

# Clone the react SDK
git clone https://github.com/fells-code/seamless-auth-react.git
```

---

## 2. Run the Seamless Auth Server

```bash
cd seamless-auth-api
cp .env.example .env
```

> IMPORTANT
> Change the AUTH_MODE env to "web" NOT "server".
> Change the APP_ORIGIN env to `http://localhost:5173` to match vite
> This lets you authenticate between a web app and the auth server with no need for an API.

### If docker and docker compose are avaliable

```bash
docker compose up -d
```

> If you are using docker you can stop here and move on to Step 3.

### If not using docker

Start postgres in whatever way your system does e.g. on mac

```bash
brew services start postgresql
```

### Prepare the database

```bash
npm install

npm run db:create
npm run db:migrate

npm run dev
```

---

Ensure the server is running locally (default: `http://localhost:5312`).

```bash
curl http://localhost:5312/health/status

## Expected result
## {"message":"System up"}
```

---

## 3. Create a Local Test Application

You will need a web application to integerate the SDK into.
We recommend using Vite for fast iteration:

```bash
# If still in the auth directory
cd ../

npm create vite@latest seamless-auth-dev
### Select React as the framework, Typescript as the variant
```

> Web site will be active at http://localhost:5137

---

## 4. Link the React Package

From the `seamless-auth-react` repository:

```bash
npm install
npm link
```

Then inside your test application:

```bash
npm link @seamless-auth/react
npm install react-router-dom
```

---

## 5. Wrap Your Application with AuthProvider

Update `main.tsx`:

```tsx
// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, AuthRoutes, useAuth } from '@seamless-auth/react';
import './index.css';
import App from './App.tsx';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// eslint-disable-next-line react-refresh/only-export-components
function ApplicationRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {isAuthenticated ? (
        <Route path="*" element={<App />} />
      ) : (
        <Route path="*" element={<AuthRoutes />} />
      )}
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider apiHost="http://localhost:5312" mode="web">
        <ApplicationRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

---

## 6. Run the SDK in Watch Mode

Inside `seamless-auth-react`:

```bash
npm run build -- --watch
```

Changes will automatically rebuild and propagate to your linked development application.

## 7. Good working state

If all went well you should have a directory structure like this

```bash
.
├── seamless-auth-api
├── seamless-auth-dev
└── seamless-auth-react
```

Navigating to `http://localhost:5173` give you the seamless auth login page.

If so you are ready to start dev work

## Expectations

When submitting a pull request:

- Ensure the SDK works against a running local auth server
- Verify login, logout, and session behavior
- Confirm role-based logic works as expected
- Run lint and tests before submitting

This ensures changes remain aligned with real authentication flows and infrastructure behavior.

## Commit Conventions

- feat:
- fix:
- docs:
- refactor:
- test:
- chore:

Example:

feat: add configurable token expiration override

## Pull Requests Must

- Be scoped
- Include tests
- Update docs
- Pass CI

## Licensing

By contributing, you agree your contributions fall under the project license.
