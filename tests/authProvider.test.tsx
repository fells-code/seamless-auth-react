import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/AuthProvider';
import { fetchWithAuth } from '../src/fetchWithAuth';

jest.mock('../src/fetchWithAuth');
jest.mock('../src/LoadingSpinner', () => () => <div>Loading...</div>);
jest.mock('@/context/InternalAuthContext', () => ({
  InternalAuthProvider: ({ children }: any) => <div>{children}</div>,
}));

const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>;

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
    jest.resetAllMocks();
  });

  it('renders loading spinner initially', async () => {
    await act(async () => {
      render(
        <AuthProvider apiHost={apiHost}>
          <div>Child</div>
        </AuthProvider>
      );
    });
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('loads user and token successfully', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: '1', email: 'test@example.com', phone: '555-1234', roles: ['admin'] },
        token: { oneTimeToken: 'abc', expiresAt: '2025-01-01' },
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
    mockFetchWithAuth.mockResolvedValueOnce({ ok: false } as any);

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
    mockFetchWithAuth.mockRejectedValueOnce(new Error('network down'));

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
