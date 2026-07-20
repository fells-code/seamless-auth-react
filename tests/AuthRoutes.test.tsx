/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AuthRoutes } from '../src/AuthRoutes';
import { authRoutePaths, legacyAuthRouteAliases } from '../src/routes';

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

describe('AuthRoutes legacy aliases', () => {
  it.each(legacyAuthRouteAliases.map(alias => [alias.from, alias.to]))(
    'forwards %s to %s',
    (from, to) => {
      renderAt(from);
      expect(screen.getByTestId('pathname')).toHaveTextContent(to);
    }
  );

  it('preserves the magic-link token across the legacy redirect', () => {
    // The auth API emails this URL, so dropping the query would break sign-in.
    renderAt('/verify-magiclink?token=abc123');

    expect(screen.getByTestId('pathname')).toHaveTextContent(
      authRoutePaths.verifyMagicLink
    );
    expect(screen.getByTestId('search')).toHaveTextContent('?token=abc123');
  });

  it('preserves router state across the legacy redirect', () => {
    renderAt('/magiclinks-sent', { identifier: 'user@example.com' });

    expect(screen.getByTestId('pathname')).toHaveTextContent(
      authRoutePaths.magicLinkSent
    );
    expect(screen.getByTestId('state')).toHaveTextContent('user@example.com');
  });
});
