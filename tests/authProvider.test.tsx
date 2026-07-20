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
      <button onClick={() => void auth.verifyStepUpWithTotp('123456')}>
        Verify TOTP step-up
      </button>
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

const apiHost = 'https://api.example.com/';

/**
 * Renders the provider with an authenticated session already loaded and hands
 * back the context, so tests can drive helpers directly rather than through UI.
 */
const renderAndCaptureAuth = async (credentials: unknown[] = []) => {
  let auth: ReturnType<typeof useAuth> | null = null;

  const Capture = () => {
    auth = useAuth();
    return null;
  };

  mockFetchWithAuthImpl.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      user: { id: '1', email: 'test@example.com', phone: '', roles: [] },
      credentials,
    }),
  } as any);

  await act(async () => {
    render(
      <AuthProvider apiHost={apiHost}>
        <Capture />
      </AuthProvider>
    );
  });

  return auth as unknown as ReturnType<typeof useAuth>;
};

const failure = (status = 500, body: unknown = { error: 'Nope' }) =>
  ({ ok: false, status, json: async () => body }) as any;

describe('AuthProvider', () => {
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
    // Both calls need a response: the failed /users/me, and the logout that
    // follows it.
    mockFetchWithAuthImpl
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any);

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
    mockFetchWithAuthImpl
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any);

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

  it('records a fresh step-up after a successful TOTP verification', async () => {
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
          message: 'Success',
          fresh: true,
          method: 'totp',
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

    fireEvent.click(screen.getByRole('button', { name: /verify totp step-up/i }));

    await waitFor(() => {
      expect(screen.getByTestId('stepUpFresh')).toHaveTextContent('true');
    });

    expect(mockFetchWithAuthImpl).toHaveBeenCalledWith('/totp/verify-mfa', {
      method: 'POST',
      body: JSON.stringify({ code: '123456' }),
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

  it('returns the credential itself rather than the response wrapper', async () => {
    let auth: ReturnType<typeof useAuth> | null = null;

    const Capture = () => {
      auth = useAuth();
      return null;
    };

    const credential = buildCredential();
    const updatedCredential = buildCredential({ friendlyName: 'Renamed passkey' });

    mockFetchWithAuthImpl
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com', phone: '', roles: [] },
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
          <Capture />
        </AuthProvider>
      );
    });

    const returned = await (
      auth as unknown as ReturnType<typeof useAuth>
    ).updateCredential({
      ...credential,
      friendlyName: 'Renamed passkey',
    });

    // The API wraps the payload as { message, credential }. Surfacing the
    // wrapper would hand callers an object with no credential fields on it.
    expect(returned.error).toBeNull();
    expect(returned.data).toEqual(updatedCredential);
    expect(returned.data?.friendlyName).toBe('Renamed passkey');
    expect(returned.data).not.toHaveProperty('message');
  });

  describe('failure paths', () => {
    it('throws when useAuth is called outside a provider', () => {
      const Orphan = () => {
        useAuth();
        return null;
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Orphan />)).toThrow(/must be used within an AuthProvider/i);

      consoleSpy.mockRestore();
    });

    it('reports a failed passkey login without touching the session', async () => {
      const auth = await renderAndCaptureAuth();

      // The start call fails, so no assertion is ever attempted.
      mockFetchWithAuthImpl.mockResolvedValueOnce(failure(401));

      expect((await auth.handlePasskeyLogin()).error).not.toBeNull();
    });

    it('clears auth state even when signing out fails', async () => {
      const auth = await renderAndCaptureAuth();

      mockFetchWithAuthImpl.mockResolvedValueOnce(failure(500));

      await act(async () => {
        await auth.logoutAllSessions();
      });

      // Local state must not survive a failed sign-out, otherwise the UI keeps
      // showing an authenticated user who no longer has a usable session.
      expect(screen.queryByTestId('user')).toBeNull();
    });

    it('surfaces a failed account deletion', async () => {
      const auth = await renderAndCaptureAuth();

      mockFetchWithAuthImpl.mockResolvedValueOnce(
        failure(403, { error: 'Deletion is disabled' })
      );

      const { error } = await auth.deleteUser();

      expect(error).toMatchObject({ message: 'Deletion is disabled', status: 403 });
    });

    it('surfaces a failed credential update', async () => {
      const auth = await renderAndCaptureAuth([buildCredential()]);

      mockFetchWithAuthImpl.mockResolvedValueOnce(
        failure(409, { error: 'Name already used' })
      );

      const { error } = await auth.updateCredential({
        ...buildCredential(),
        friendlyName: 'x',
      });

      expect(error).toMatchObject({ message: 'Name already used', status: 409 });
    });

    it('surfaces a failed credential deletion', async () => {
      const auth = await renderAndCaptureAuth([buildCredential()]);

      mockFetchWithAuthImpl.mockResolvedValueOnce(failure(404));

      const { error } = await auth.deleteCredential('cred-1');

      expect(error).toMatchObject({ status: 404 });
    });

    it('surfaces a failed organization switch', async () => {
      const auth = await renderAndCaptureAuth();

      mockFetchWithAuthImpl.mockResolvedValueOnce(
        failure(403, { error: 'Not a member' })
      );

      const { error } = await auth.switchOrganization('org-1');

      expect(error).toMatchObject({ message: 'Not a member' });
    });

    it('reports OAuth helper failures as results', async () => {
      const auth = await renderAndCaptureAuth();

      mockFetchWithAuthImpl
        .mockResolvedValueOnce(failure(500))
        .mockResolvedValueOnce(failure(400, { error: 'Unknown provider' }));

      expect((await auth.listOAuthProviders()).error).toMatchObject({ status: 500 });
      expect((await auth.startOAuthLogin({ providerId: 'nope' })).error).toMatchObject({
        message: 'Unknown provider',
      });
    });

    it('clears step-up status when it cannot be loaded', async () => {
      const auth = await renderAndCaptureAuth();

      mockFetchWithAuthImpl.mockResolvedValueOnce(failure(401));

      const { data, error } = await auth.refreshStepUpStatus();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    it('leaves step-up status untouched when verification fails', async () => {
      mockFetchWithAuthImpl
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: '1', email: 'test@example.com', phone: '', roles: [] },
            credentials: [],
          }),
        } as any)
        // A 200 that does not report a fresh verification is still a failure,
        // so provider state must not record a step-up that did not happen.
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Rejected', fresh: false, method: null }),
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

      fireEvent.click(screen.getByRole('button', { name: /verify totp step-up/i }));

      await waitFor(() => {
        expect(mockFetchWithAuthImpl).toHaveBeenCalledWith(
          '/totp/verify-mfa',
          expect.anything()
        );
      });

      expect(screen.getByTestId('stepUpFresh')).toHaveTextContent('false');
    });
  });

  describe('finishOAuthLogin failures', () => {
    const input = { providerId: 'github', code: 'code', state: 'state' };

    it('surfaces the auth server error detail instead of a generic message', async () => {
      const auth = await renderAndCaptureAuth();

      mockFetchWithAuthImpl.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'OAuth signup is disabled' }),
      } as any);

      const { error } = await auth.finishOAuthLogin(input);

      expect(error).toMatchObject({
        name: 'SeamlessAuthError',
        message: 'OAuth signup is disabled',
        status: 403,
        body: { error: 'OAuth signup is disabled' },
      });
    });

    it('falls back to a generic message when the body is not JSON', async () => {
      const auth = await renderAndCaptureAuth();

      mockFetchWithAuthImpl.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      } as any);

      const { error } = await auth.finishOAuthLogin(input);

      expect(error).toMatchObject({
        name: 'SeamlessAuthError',
        message: 'Failed to finish OAuth login.',
        status: 502,
      });
    });
  });
});
