/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { render, screen, waitFor } from '@testing-library/react';
import OAuthCallback from '@/views/OAuthCallback';

import { useAuth } from '@/AuthProvider';
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
    finishOAuthLogin.mockResolvedValue(undefined);
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

  test('shows an error when the callback params are missing', async () => {
    (useSearchParams as jest.Mock).mockReturnValue([new URLSearchParams('')]);

    render(<OAuthCallback />);

    expect(await screen.findByText('Sign-in failed')).toBeInTheDocument();
    expect(finishOAuthLogin).not.toHaveBeenCalled();
  });
});
