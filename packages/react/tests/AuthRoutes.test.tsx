/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AuthRoutes } from '../src/AuthRoutes';
import { authRoutePaths } from '../src/routes';

jest.mock('@/views/Login', () => () => <div>Login Page</div>);
jest.mock('@/views/PassKeyLogin', () => () => <div>Passkey Login Page</div>);
jest.mock('@/views/PassKeyRegistration', () => () => <div>Register Passkey Page</div>);
jest.mock('@/views/PhoneRegistration', () => () => <div>Verify Phone Page</div>);
jest.mock('@/views/EmailRegistration', () => () => <div>Verify Email Page</div>);
jest.mock('@/views/OAuthCallback', () => () => <div>OAuth Callback Page</div>);
jest.mock('@/components/MagicLinkSent', () => () => <div>Magic Link Sent Page</div>);

// Reports where the router ended up, so alias redirects can be asserted on the
// resulting location rather than only on the rendered screen.
jest.mock('@/views/VerifyMagicLink', () => {
  const { useLocation: useRouterLocation } = jest.requireActual('react-router-dom');

  return () => {
    const location = useRouterLocation();
    return (
      <div>
        <span>Verify Magic Link Page</span>
        <span data-testid="search">{location.search}</span>
      </div>
    );
  };
});

const LocationProbe = () => {
  const location = useLocation();

  return (
    <>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
    </>
  );
};

const renderAt = (path: string, state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: path.split('?')[0],
          search: path.includes('?') ? `?${path.split('?')[1]}` : '',
          state,
        },
      ]}
    >
      <AuthRoutes />
      <LocationProbe />
    </MemoryRouter>
  );

describe('AuthRoutes canonical paths', () => {
  const cases: Array<[string, string]> = [
    [authRoutePaths.login, 'Login Page'],
    [authRoutePaths.passkeyLogin, 'Passkey Login Page'],
    [authRoutePaths.verifyPhoneOtp, 'Verify Phone Page'],
    [authRoutePaths.verifyEmailOtp, 'Verify Email Page'],
    [authRoutePaths.verifyMagicLink, 'Verify Magic Link Page'],
    [authRoutePaths.oauthCallback, 'OAuth Callback Page'],
    [authRoutePaths.registerPasskey, 'Register Passkey Page'],
    [authRoutePaths.magicLinkSent, 'Magic Link Sent Page'],
  ];

  it.each(cases)('renders %s', (path, expected) => {
    renderAt(path);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('redirects unknown routes to login', () => {
    renderAt('/some/unknown/route');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent(authRoutePaths.login);
  });
});

describe('externally owned paths', () => {
  // The auth API builds this URL when it emails a magic link
  // (seamless-auth-api/src/controllers/magicLinks.ts). If this path is renamed
  // here without changing the API, every emailed link falls through to the
  // catch-all and lands on /login with the token discarded, which silently
  // breaks magic-link sign-in.
  it('serves the magic-link URL the auth API emails, with its token intact', () => {
    renderAt('/verify-magiclink?token=abc123');

    expect(screen.getByText('Verify Magic Link Page')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?token=abc123');
  });

  // Registered with OAuth providers as an allowed redirect URI.
  it('serves the OAuth callback path registered with providers', () => {
    renderAt('/oauth/callback?code=abc&state=xyz');

    expect(screen.getByText('OAuth Callback Page')).toBeInTheDocument();
  });
});

describe('superseded paths are gone', () => {
  it.each([
    '/passKeyLogin',
    '/verifyPhoneOTP',
    '/verifyEmailOTP',
    '/registerPasskey',
    '/magiclinks-sent',
  ])('%s no longer resolves and falls back to login', path => {
    renderAt(path);
    expect(screen.getByTestId('pathname')).toHaveTextContent(authRoutePaths.login);
  });
});
