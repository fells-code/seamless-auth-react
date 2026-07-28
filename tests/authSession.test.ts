/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createAuthSession } from '../src/session/createAuthSession';
import { createMemoryStorage, SessionStoragePort } from '../src/session/storage';
import { createFetchWithAuth } from '../src/fetchWithAuth';

jest.mock('../src/fetchWithAuth');

const mockFetchWithAuth = jest.fn();

(createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuth);

const apiHost = 'https://api.example.com';

const user = { id: '1', email: 'test@example.com', phone: '', roles: ['admin'] };

const okResponse = (body: unknown = {}) =>
  ({ ok: true, json: async () => body }) as unknown as Response;

const failedResponse = (status = 401, body: unknown = {}) =>
  ({ ok: false, status, json: async () => body }) as unknown as Response;

const buildSession = (storage: SessionStoragePort = createMemoryStorage()) =>
  createAuthSession({ apiHost, storage });

describe('createAuthSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetchWithAuth);
  });

  it('starts signed out and loading, before anything is requested', () => {
    const session = buildSession();

    expect(session.getState()).toEqual({
      user: null,
      credentials: [],
      organizations: [],
      activeOrganization: null,
      stepUpStatus: null,
      isAuthenticated: false,
      loading: true,
      hasSignedInBefore: false,
    });
    expect(mockFetchWithAuth).not.toHaveBeenCalled();
  });

  it('populates the session and notifies subscribers', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(
      okResponse({ user, credentials: [{ id: 'cred-1' }] })
    );

    const session = buildSession();
    const listener = jest.fn();
    session.subscribe(listener);

    await session.actions.refreshSession();

    expect(session.getState()).toMatchObject({
      user,
      credentials: [{ id: 'cred-1' }],
      isAuthenticated: true,
      loading: false,
    });
    expect(listener).toHaveBeenCalled();
  });

  it('returns the same snapshot reference until something changes', async () => {
    mockFetchWithAuth.mockResolvedValue(okResponse({ user, credentials: [] }));

    const session = buildSession();
    await session.actions.refreshSession();

    const snapshot = session.getState();

    // A no-op transition must not produce a new object, or useSyncExternalStore
    // re-renders forever.
    session.actions.markSignedIn();

    expect(session.getState()).toBe(snapshot);
  });

  it('clears the session locally instead of calling logout when validation fails', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(failedResponse());

    const session = buildSession();
    const { error } = await session.actions.refreshSession();

    expect(error).not.toBeNull();
    expect(session.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1);
  });

  it('clears local state even when the logout request fails', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(okResponse({ user, credentials: [] }));

    const session = buildSession();
    await session.actions.refreshSession();

    mockFetchWithAuth.mockResolvedValueOnce(failedResponse(500));

    const { error } = await session.actions.logout();

    expect(error).not.toBeNull();
    expect(session.getState()).toMatchObject({ user: null, isAuthenticated: false });
  });

  it('ignores a slow session read that a newer one has already superseded', async () => {
    let resolveFirst: (response: Response) => void = () => {};

    mockFetchWithAuth
      .mockImplementationOnce(
        () =>
          new Promise<Response>(resolve => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce(
        okResponse({ user: { ...user, email: 'newest@example.com' }, credentials: [] })
      );

    const session = buildSession();
    const stale = session.actions.refreshSession();
    await session.actions.refreshSession();

    resolveFirst(
      okResponse({ user: { ...user, email: 'stale@example.com' }, credentials: [] })
    );
    await stale;

    expect(session.getState().user?.email).toBe('newest@example.com');
  });

  it('drops updates once destroyed', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(okResponse({ user, credentials: [] }));

    const session = buildSession();
    const listener = jest.fn();
    session.subscribe(listener);

    const pending = session.actions.refreshSession();
    session.destroy();
    await pending;

    expect(session.getState().isAuthenticated).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  describe('previous sign-in', () => {
    it('reads the stored flag when the session is created', () => {
      const storage = createMemoryStorage();
      storage.set('seamlessauth_seen', 'true');

      expect(buildSession(storage).getState().hasSignedInBefore).toBe(true);
    });

    it('records a sign-in through the storage port', async () => {
      const storage = createMemoryStorage();
      mockFetchWithAuth.mockResolvedValueOnce(okResponse({ user, credentials: [] }));

      const session = buildSession(storage);
      await session.actions.refreshSession();

      expect(storage.get('seamlessauth_seen')).toBe('true');
      expect(session.getState().hasSignedInBefore).toBe(true);
    });

    it('records but never surfaces the flag when detection is off', async () => {
      const storage = createMemoryStorage();
      const session = createAuthSession({
        apiHost,
        storage,
        detectPreviousSignIn: false,
      });

      session.actions.markSignedIn();

      expect(storage.get('seamlessauth_seen')).toBe('true');
      expect(session.getState().hasSignedInBefore).toBe(false);
    });

    it('surfaces a storage port that breaks the never-throw contract', () => {
      const storage: SessionStoragePort = {
        get: () => {
          throw new Error('denied');
        },
        set: () => {
          throw new Error('denied');
        },
      };

      // The browser port swallows these, so a port that throws is a caller bug
      // rather than something the store hides. What matters is that it surfaces
      // instead of corrupting session state.
      expect(() => buildSession(storage)).toThrow('denied');
    });
  });

  describe('step-up', () => {
    it('clears the status when it cannot be loaded', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(
        okResponse({ fresh: true, method: 'totp', maxAgeSeconds: 300 })
      );

      const session = buildSession();
      await session.actions.refreshStepUpStatus();
      expect(session.getState().stepUpStatus).not.toBeNull();

      mockFetchWithAuth.mockResolvedValueOnce(failedResponse(500));
      await session.actions.refreshStepUpStatus();

      expect(session.getState().stepUpStatus).toBeNull();
    });

    it('leaves the status untouched when a verification fails', async () => {
      mockFetchWithAuth.mockResolvedValueOnce(
        okResponse({
          fresh: true,
          method: 'totp',
          verifiedAt: null,
          expiresAt: null,
          maxAgeSeconds: 300,
        })
      );

      const session = buildSession();
      await session.actions.refreshStepUpStatus();

      const before = session.getState().stepUpStatus;

      mockFetchWithAuth.mockResolvedValueOnce(failedResponse(400));
      await session.actions.verifyStepUpWithTotp('000000');

      expect(session.getState().stepUpStatus).toBe(before);
    });
  });

  describe('credentials', () => {
    const loadWithCredential = async () => {
      mockFetchWithAuth.mockResolvedValueOnce(
        okResponse({
          user,
          credentials: [{ id: 'cred-1', friendlyName: 'Old passkey' }],
        })
      );

      const session = buildSession();
      await session.actions.refreshSession();

      return session;
    };

    it('returns the credential itself rather than the response wrapper', async () => {
      const session = await loadWithCredential();

      mockFetchWithAuth.mockResolvedValueOnce(
        okResponse({ credential: { id: 'cred-1', friendlyName: 'Renamed' } })
      );

      const { data } = await session.actions.updateCredential({
        id: 'cred-1',
        friendlyName: 'Renamed',
      } as never);

      expect(data).toEqual({ id: 'cred-1', friendlyName: 'Renamed' });
      expect(session.getState().credentials[0]).toMatchObject({
        friendlyName: 'Renamed',
      });
    });

    it('removes a deleted credential from state', async () => {
      const session = await loadWithCredential();

      mockFetchWithAuth.mockResolvedValueOnce(okResponse({ message: 'Success' }));
      await session.actions.deleteCredential('cred-1');

      expect(session.getState().credentials).toEqual([]);
    });
  });

  describe('role checks', () => {
    it('reports roles from the loaded user and undefined without one', async () => {
      const session = buildSession();

      expect(session.actions.hasRole('admin')).toBeUndefined();
      expect(session.actions.hasScopedRole('admin:read')).toBeUndefined();

      mockFetchWithAuth.mockResolvedValueOnce(okResponse({ user, credentials: [] }));
      await session.actions.refreshSession();

      expect(session.actions.hasRole('admin')).toBe(true);
      expect(session.actions.hasRole('owner')).toBe(false);
      expect(session.actions.hasScopedRole('admin:read')).toBe(true);
    });
  });
});
