/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from '@testing-library/react';
import OAuthCallback from '@/views/OAuthCallback';

import { useAuth } from '@/AuthProvider';
import { SeamlessAuthError } from '@/client/errors';
import { useNavigate, useSearchParams } from 'react-router-dom';

jest.mock('@/AuthProvider');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('OAuthCallback', () => {
  const navigate = jest.fn();
  const finishOAuthLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    (useNavigate as jest.Mock).mockReturnValue(navigate);
    (useAuth as jest.Mock).mockReturnValue({ finishOAuthLogin });
  });

  test('finishes the login and navigates home', async () => {
    finishOAuthLogin.mockResolvedValue({ data: { message: 'Success' }, error: null });
    window.sessionStorage.setItem('seamless:oauth:provider', 'mock');
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('code=abc&state=xyz'),
    ]);

    render(<OAuthCallback />);

    await waitFor(() =>
      expect(finishOAuthLogin).toHaveBeenCalledWith({
        providerId: 'mock',
        code: 'abc',
        state: 'xyz',
      })
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    expect(window.sessionStorage.getItem('seamless:oauth:provider')).toBeNull();
  });

  // The destination was validated against the configured origins and signed into the
  // state by the auth server, so it comes back as a URL rather than a path.
  test('lands on the returnTo the flow asked for', async () => {
    finishOAuthLogin.mockResolvedValue({
      data: {
        message: 'Success',
        returnTo: `${window.location.origin}/dashboard?tab=billing#top`,
      },
      error: null,
    });
    window.sessionStorage.setItem('seamless:oauth:provider', 'mock');
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('code=abc&state=xyz'),
    ]);

    render(<OAuthCallback />);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/dashboard?tab=billing#top')
    );
  });

  // These views route with react-router, which cannot leave the application. An adopter
  // that wants to is expected to read returnTo off the client result and navigate itself.
  test('falls back home when the returnTo is on another origin', async () => {
    finishOAuthLogin.mockResolvedValue({
      data: { message: 'Success', returnTo: 'https://elsewhere.example/dashboard' },
      error: null,
    });
    window.sessionStorage.setItem('seamless:oauth:provider', 'mock');
    (useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams('code=abc&state=xyz'),
    ]);

    render(<OAuthCallback />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  // The auth server refuses these before signing the state, so this is defence in depth
  // against a malformed or hostile response rather than the primary guard. A
  // javascript: URL parses but has no origin, so the origin check rejects it too.
  test.each(['//', 'http://', 'javascript:alert(1)'])(
    'falls back home for a %s returnTo',
    async returnTo => {
      finishOAuthLogin.mockResolvedValue({
        data: { message: 'Success', returnTo },
        error: null,
      });
      window.sessionStorage.setItem('seamless:oauth:provider', 'mock');
      (useSearchParams as jest.Mock).mockReturnValue([
        new URLSearchParams('code=abc&state=xyz'),
      ]);

      render(<OAuthCallback />);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    }
  );

  test('shows an error when the callback params are missing', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([new URLSearchParams('')]);

    render(<OAuthCallback />);

    expect(await screen.findByText('Sign-in failed')).toBeInTheDocument();
    expect(finishOAuthLogin).not.toHaveBeenCalled();
  });

  describe('callback failures', () => {
    const renderWithError = (error: unknown) => {
      finishOAuthLogin.mockResolvedValue({ data: null, error });
      window.sessionStorage.setItem('seamless:oauth:provider', 'mock');
      (useSearchParams as jest.Mock).mockReturnValue([
        new URLSearchParams('code=abc&state=xyz'),
      ]);

      render(<OAuthCallback />);
    };

    test.each([
      ['oauth_missing_email', /did not share an email address/],
      ['oauth_email_not_verified', /is not verified/],
      ['oauth_missing_subject', /usable account identifier/],
    ])('maps %s to curated messaging', async (code, expected) => {
      renderWithError(new SeamlessAuthError('Sign-in failed', 400, { code }));

      expect(await screen.findByText(expected)).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });

    test('falls back to the generic message for an unrecognized failure', async () => {
      renderWithError(new SeamlessAuthError('Sign-in failed', 400, { error: 'nope' }));

      expect(
        await screen.findByText('We could not complete sign-in. Please try again.')
      ).toBeInTheDocument();
    });

    test('keeps the provider in storage so a retry can reuse it', async () => {
      renderWithError(new SeamlessAuthError('Sign-in failed', 500));

      await screen.findByText('We could not complete sign-in. Please try again.');
      expect(window.sessionStorage.getItem('seamless:oauth:provider')).toBe('mock');
    });
  });
});
