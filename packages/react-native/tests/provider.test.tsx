/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { AuthProvider, useAuth } from '../src/AuthProvider';
import { useAuthClient } from '../src/hooks/useAuthClient';
import { useAuthorizedFetch } from '../src/hooks/useAuthorizedFetch';
import { useLoginMethods } from '../src/hooks/useLoginMethods';
import { usePasskeySupport } from '../src/hooks/usePasskeySupport';
import { createSecureStoreTokenStorage } from '../src/ports/secureStoreTokenStorage';

const API = 'https://api.example.com';

function json(status: number, body: unknown) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    clone() {
      return { json: async () => body };
    },
  } as unknown as Response;
}

const passkeys = {
  isSupported: () => true,
  isPlatformAuthenticatorAvailable: async () => true,
  create: jest.fn(),
  get: jest.fn(),
};

function fakeSecureStore(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      items.delete(key);
    },
    items,
  };
}

const Consumer = () => {
  const auth = useAuth();
  const client = useAuthClient();
  const authorizedFetch = useAuthorizedFetch();
  const { passkeySupported, loading: passkeyLoading } = usePasskeySupport();
  const { loginMethods } = useLoginMethods();

  return (
    <>
      <span data-testid="user">{auth.user ? auth.user.email : 'none'}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="same-client">{String(client === auth.client)}</span>
      <span data-testid="same-fetch">
        {String(authorizedFetch === auth.client.authorizedFetch)}
      </span>
      <span data-testid="passkeys">
        {passkeyLoading ? 'checking' : String(passkeySupported)}
      </span>
      <span data-testid="methods">{loginMethods?.join(',') ?? 'unknown'}</span>
    </>
  );
};

describe('AuthProvider (react-native)', () => {
  it('restores a session from the keystore over bearer transport', async () => {
    const store = fakeSecureStore({
      'seamless-auth.session': JSON.stringify({
        accessToken: 'access-1',
        refreshToken: 'r-1',
      }),
    });
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      if (String(input).endsWith('/users/me')) {
        return json(200, {
          user: { id: 'u1', email: 'user@example.com', phone: null, roles: ['athlete'] },
          credentials: [],
        });
      }
      return json(200, { loginMethods: ['passkey', 'email_otp'] });
    }) as unknown as typeof fetch;

    await act(async () => {
      render(
        <AuthProvider
          apiHost={API}
          fetch={fetchImpl}
          ports={{ passkeys, tokenStorage: createSecureStoreTokenStorage(store) }}
        >
          <Consumer />
        </AuthProvider>
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('user@example.com')
    );
    expect(screen.getByTestId('same-client')).toHaveTextContent('true');
    expect(screen.getByTestId('same-fetch')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('passkeys')).toHaveTextContent('true'));
    await waitFor(() =>
      expect(screen.getByTestId('methods')).toHaveTextContent('passkey,email_otp')
    );

    const me = calls.find(c => c.url === `${API}/auth/users/me`);
    expect(me).toBeDefined();
    expect((me!.init.headers as Record<string, string>).Authorization).toBe(
      'Bearer access-1'
    );
    expect(
      (me!.init.headers as Record<string, string>)['x-seamless-auth-transport']
    ).toBe('bearer');
    expect(me!.init.credentials).toBeUndefined();
  });

  it('starts signed out when the keystore is empty, without asking for a refresh', async () => {
    const calls: string[] = [];
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return json(401, { error: 'unauthenticated' });
    }) as unknown as typeof fetch;

    await act(async () => {
      render(
        <AuthProvider apiHost={API} fetch={fetchImpl} ports={{ passkeys }}>
          <Consumer />
        </AuthProvider>
      );
    });

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(calls.filter(url => url.endsWith('/refresh'))).toHaveLength(0);
  });

  it('honours a custom mount path', async () => {
    const calls: string[] = [];
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return json(401, {});
    }) as unknown as typeof fetch;

    await act(async () => {
      render(
        <AuthProvider
          apiHost={API}
          basePath="/identity"
          fetch={fetchImpl}
          ports={{ passkeys }}
        >
          <Consumer />
        </AuthProvider>
      );
    });

    await waitFor(() => expect(calls).toContain(`${API}/identity/users/me`));
  });

  it('throws when useAuth is used outside the provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => render(<Consumer />)).toThrow(/within an AuthProvider/);
    } finally {
      spy.mockRestore();
    }
  });
});
