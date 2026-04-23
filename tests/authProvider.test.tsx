/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/AuthProvider';
import { createFetchWithAuth } from '../src/fetchWithAuth';

jest.mock('../src/fetchWithAuth');

// the mock returned fetch function
const mockFetchWithAuthImpl = jest.fn();
// make createFetchWithAuth return our mock function
(createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuthImpl);

const Consumer = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.email : 'none'}</span>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="hasRoleAdmin">{String(auth.hasRole('admin'))}</span>
    </div>
  );
};

describe('AuthProvider', () => {
  const apiHost = 'https://api.example.com/';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads user and credentials successfully', async () => {
    mockFetchWithAuthImpl.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', email: 'test@example.com', phone: '555-1234', roles: ['admin'] },
        credentials: [],
      }),
    } as any);

    await act(async () => {
      render(
        <AuthProvider apiHost={apiHost}>
          <Consumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('hasRoleAdmin')).toHaveTextContent('true');
  });

  it('logs out if token validation fails (bad response)', async () => {
    mockFetchWithAuthImpl.mockResolvedValueOnce({ ok: false } as any);

    await act(async () => {
      render(
        <AuthProvider apiHost={apiHost}>
          <Consumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
  });

  it('logs out if token validation throws', async () => {
    mockFetchWithAuthImpl.mockRejectedValueOnce(new Error('network down'));

    await act(async () => {
      render(
        <AuthProvider apiHost={apiHost}>
          <Consumer />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
  });
});
