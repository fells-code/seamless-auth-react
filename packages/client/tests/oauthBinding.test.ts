/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { createAuthSession } from '../src/session/createAuthSession';
import { OAUTH_BINDING_STORAGE_KEY } from '../src/session/oauthBinding';
import { createMemoryStorage } from '../src/session/storage';

jest.mock('../src/fetchWithAuth', () => ({
  createFetchWithAuth: () => jest.fn(),
  createFetchTransport: () => ({
    fetch: jest.fn(),
    authorizedFetch: jest.fn(),
    mode: 'cookie',
    clearTokens: jest.fn(),
  }),
}));

const user = { id: '1', email: 'test@example.com', phone: '', roles: [] };

const started = (state: string, binding?: string) => ({
  data: {
    provider: { id: 'mock', name: 'Mock' },
    state,
    authorizationUrl: 'https://idp.example/authorize',
    ...(binding ? { binding } : {}),
  },
  error: null,
});

function buildSession() {
  const client = {
    startOAuthLogin: jest.fn(),
    finishOAuthLogin: jest.fn().mockResolvedValue({ data: {}, error: null }),
    getCurrentUser: jest.fn().mockResolvedValue({
      data: { user, credentials: [] },
      error: null,
    }),
    isRecoverySession: () => false,
  };
  const session = createAuthSession({
    apiHost: 'https://api.example.com',
    client: client as never,
    storage: createMemoryStorage(),
  });

  return { client, session };
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('OAuth state binding', () => {
  it('stores the binding with its state when sign-in starts', async () => {
    const { client, session } = buildSession();
    client.startOAuthLogin.mockResolvedValue(started('s1', 'b1'));

    await session.actions.startOAuthLogin({ providerId: 'mock' });

    expect(JSON.parse(sessionStorage.getItem(OAUTH_BINDING_STORAGE_KEY)!)).toEqual({
      state: 's1',
      binding: 'b1',
    });
  });

  it('attaches the stored binding to the callback and clears it afterwards', async () => {
    const { client, session } = buildSession();
    client.startOAuthLogin.mockResolvedValue(started('s1', 'b1'));

    await session.actions.startOAuthLogin({ providerId: 'mock' });
    const result = await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });

    expect(result.error).toBeNull();
    expect(client.finishOAuthLogin).toHaveBeenCalledWith({
      providerId: 'mock',
      code: 'c',
      state: 's1',
      binding: 'b1',
    });
    expect(sessionStorage.getItem(OAUTH_BINDING_STORAGE_KEY)).toBeNull();
    expect(session.getState().user).toEqual(user);
  });

  it('clears the binding when the callback fails', async () => {
    const { client, session } = buildSession();
    client.startOAuthLogin.mockResolvedValue(started('s1', 'b1'));
    client.finishOAuthLogin.mockResolvedValue({
      data: null,
      error: new Error('Invalid OAuth state'),
    });

    await session.actions.startOAuthLogin({ providerId: 'mock' });
    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });

    expect(sessionStorage.getItem(OAUTH_BINDING_STORAGE_KEY)).toBeNull();
    expect(client.getCurrentUser).not.toHaveBeenCalled();
  });

  it('does not send a binding stored for a different state', async () => {
    const { client, session } = buildSession();
    client.startOAuthLogin.mockResolvedValue(started('s1', 'b1'));

    await session.actions.startOAuthLogin({ providerId: 'mock' });
    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's2',
    });

    expect(client.finishOAuthLogin).toHaveBeenCalledWith({
      providerId: 'mock',
      code: 'c',
      state: 's2',
    });
  });

  it('prefers a binding the caller passes', async () => {
    const { client, session } = buildSession();
    client.startOAuthLogin.mockResolvedValue(started('s1', 'b1'));

    await session.actions.startOAuthLogin({ providerId: 'mock' });
    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
      binding: 'explicit',
    });

    expect(client.finishOAuthLogin).toHaveBeenCalledWith(
      expect.objectContaining({ binding: 'explicit' })
    );
  });

  it('drops a stale binding when a server without binding starts sign-in', async () => {
    const { client, session } = buildSession();
    client.startOAuthLogin
      .mockResolvedValueOnce(started('s1', 'b1'))
      .mockResolvedValueOnce(started('s1'));

    await session.actions.startOAuthLogin({ providerId: 'mock' });
    await session.actions.startOAuthLogin({ providerId: 'mock' });
    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });

    expect(sessionStorage.getItem(OAUTH_BINDING_STORAGE_KEY)).toBeNull();
    expect(client.finishOAuthLogin).toHaveBeenCalledWith({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });
  });

  it('survives a redirect by reading the binding back from sessionStorage', async () => {
    sessionStorage.setItem(
      OAUTH_BINDING_STORAGE_KEY,
      JSON.stringify({ state: 's1', binding: 'b1' })
    );
    const { client, session } = buildSession();

    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });

    expect(client.finishOAuthLogin).toHaveBeenCalledWith(
      expect.objectContaining({ binding: 'b1' })
    );
  });

  it('ignores an unreadable stored value', async () => {
    sessionStorage.setItem(OAUTH_BINDING_STORAGE_KEY, '{not json');
    const { client, session } = buildSession();

    await session.actions.finishOAuthLogin({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });

    expect(client.finishOAuthLogin).toHaveBeenCalledWith({
      providerId: 'mock',
      code: 'c',
      state: 's1',
    });
  });

  it('keeps the binding in memory when sessionStorage refuses writes', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const removeItem = jest
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    try {
      const { client, session } = buildSession();
      client.startOAuthLogin.mockResolvedValue(started('s1', 'b1'));

      await session.actions.startOAuthLogin({ providerId: 'mock' });
      await session.actions.finishOAuthLogin({
        providerId: 'mock',
        code: 'c',
        state: 's1',
      });

      expect(client.finishOAuthLogin).toHaveBeenCalledWith(
        expect.objectContaining({ binding: 'b1' })
      );
    } finally {
      setItem.mockRestore();
      removeItem.mockRestore();
    }
  });
});
