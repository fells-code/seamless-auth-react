/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/AuthProvider';
import { createFetchWithAuth } from '../src/fetchWithAuth';

jest.mock('../src/fetchWithAuth');

// the mock returned fetch function
const mockFetchWithAuthImpl = jest.fn();
// make createFetchWithAuth return our mock function
(createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuthImpl);

const Consumer = () => {
  const auth = useAuth();
  const firstCredential = auth.credentials[0];

  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.email : 'none'}</span>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="hasRoleAdmin">{String(auth.hasRole('admin'))}</span>
      <span data-testid="hasScopedRoleAdminRead">
        {String(auth.hasScopedRole('admin:read'))}
      </span>
      <span data-testid="stepUpFresh">{String(auth.stepUpStatus?.fresh ?? false)}</span>
      <span data-testid="credentials">
        {auth.credentials.map(credential => credential.friendlyName).join(',')}
      </span>
      <button onClick={() => void auth.refreshStepUpStatus()}>Refresh step-up</button>
      <button
        onClick={() => {
          if (firstCredential) {
            void auth.updateCredential({
              ...firstCredential,
              friendlyName: 'Renamed passkey',
            });
          }
        }}
      >
        Update credential
      </button>
      <button onClick={() => void auth.deleteCredential('cred-1')}>
        Delete credential
      </button>
    </div>
  );
};

const buildCredential = (overrides = {}) =>
  ({
    id: 'cred-1',
    counter: 0,
    transports: [],
    deviceType: 'singleDevice',
    backedup: false,
    friendlyName: 'Old passkey',
    lastUsedAt: null,
    platform: 'mac',
    browser: 'chrome',
    deviceInfo: 'mac chrome',
    ...overrides,
  }) as any;

describe('AuthProvider', () => {
  const apiHost = 'https://api.example.com/';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads user and credentials successfully', async () => {
    mockFetchWithAuthImpl.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: '1',
          email: 'test@example.com',
          phone: '555-1234',
          roles: ['admin'],
        },
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
    expect(screen.getByTestId('hasScopedRoleAdminRead')).toHaveTextContent('true');
  });

  it('supports scoped role checks without changing exact role checks', async () => {
    mockFetchWithAuthImpl.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: '1',
          email: 'test@example.com',
          phone: '555-1234',
          roles: ['admin:write'],
        },
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

    expect(screen.getByTestId('hasRoleAdmin')).toHaveTextContent('false');
    expect(screen.getByTestId('hasScopedRoleAdminRead')).toHaveTextContent('true');
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

  it('refreshes step-up status on demand', async () => {
    mockFetchWithAuthImpl
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'test@example.com',
            phone: '555-1234',
            roles: ['admin'],
          },
          credentials: [],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fresh: true,
          method: 'webauthn',
          verifiedAt: '2026-05-15T12:00:00.000Z',
          expiresAt: '2026-05-15T12:05:00.000Z',
          maxAgeSeconds: 300,
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

    fireEvent.click(screen.getByRole('button', { name: /refresh step-up/i }));

    await waitFor(() => {
      expect(screen.getByTestId('stepUpFresh')).toHaveTextContent('true');
    });
  });

  it('updates credential state after a successful credential update', async () => {
    const credential = buildCredential();
    const updatedCredential = buildCredential({ friendlyName: 'Renamed passkey' });

    mockFetchWithAuthImpl
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'test@example.com',
            phone: '555-1234',
            roles: ['admin'],
          },
          credentials: [credential],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Credential updated',
          credential: updatedCredential,
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
      expect(screen.getByTestId('credentials')).toHaveTextContent('Old passkey');
    });

    fireEvent.click(screen.getByRole('button', { name: /update credential/i }));

    await waitFor(() => {
      expect(screen.getByTestId('credentials')).toHaveTextContent('Renamed passkey');
    });

    expect(screen.getByTestId('credentials')).not.toHaveTextContent('Old passkey');
    expect(mockFetchWithAuthImpl).toHaveBeenCalledTimes(2);
    expect(
      mockFetchWithAuthImpl.mock.calls.filter(([path]) => path === 'users/me')
    ).toHaveLength(1);
  });

  it('removes deleted credentials from provider state after a successful delete', async () => {
    const credential = buildCredential();
    const secondCredential = buildCredential({
      id: 'cred-2',
      friendlyName: 'Backup passkey',
    });

    mockFetchWithAuthImpl
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'test@example.com',
            phone: '555-1234',
            roles: ['admin'],
          },
          credentials: [credential, secondCredential],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Credential deleted',
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
      expect(screen.getByTestId('credentials')).toHaveTextContent('Old passkey');
    });

    fireEvent.click(screen.getByRole('button', { name: /delete credential/i }));

    await waitFor(() => {
      expect(screen.getByTestId('credentials')).not.toHaveTextContent('Old passkey');
    });

    expect(screen.getByTestId('credentials')).toHaveTextContent('Backup passkey');
    expect(mockFetchWithAuthImpl).toHaveBeenCalledTimes(2);
    expect(
      mockFetchWithAuthImpl.mock.calls.filter(([path]) => path === 'users/me')
    ).toHaveLength(1);
  });
});
