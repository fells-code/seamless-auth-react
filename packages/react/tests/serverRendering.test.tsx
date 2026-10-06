/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from '../src/AuthProvider';
import {
  createFetchTransport,
  createFetchWithAuth,
} from '../../client/src/fetchWithAuth';

jest.mock('../../client/src/fetchWithAuth');

// The browser server build needs MessageChannel, which jsdom does not provide.
// The node build renders the same markup.
const { renderToString } = jest.requireActual<typeof import('react-dom/server')>(
  'react-dom/server.node'
);

const mockFetch = jest.fn();

const apiHost = 'https://api.example.com/';
const user = { id: '1', email: 'test@example.com', phone: '', roles: [] } as any;

const Consumer = () => {
  const { user, loading, hasSignedInBefore } = useAuth();

  return (
    <p>
      {loading ? 'loading' : (user?.email ?? 'signed out')}
      {hasSignedInBefore ? ' (returning)' : ' (new)'}
    </p>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (createFetchWithAuth as jest.Mock).mockReturnValue(mockFetch);
  (createFetchTransport as jest.Mock).mockImplementation(() => ({
    fetch: mockFetch,
    authorizedFetch: jest.fn(),
    mode: 'cookie',
    clearTokens: jest.fn(),
  }));
  mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
});

describe('AuthProvider with server rendering', () => {
  it('hydrates without a mismatch when the browser remembers a previous sign-in', async () => {
    const tree = (
      <AuthProvider apiHost={apiHost}>
        <Consumer />
      </AuthProvider>
    );

    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    expect(container.textContent).toBe('loading (new)');

    // Only the browser knows this, so the server could not have rendered it.
    localStorage.setItem('seamlessauth_seen', 'true');

    const onRecoverableError = jest.fn();
    await act(async () => {
      hydrateRoot(container, tree, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('signed out (returning)');
  });

  it('renders a server-resolved session on the first paint, then revalidates quietly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user, credentials: [{ id: 'cred-1' }] }),
    });
    const loadingSeen: boolean[] = [];
    const Spy = () => {
      const { loading, credentials } = useAuth();
      loadingSeen.push(loading);
      return <span>{credentials.length} passkeys</span>;
    };

    render(
      <AuthProvider apiHost={apiHost} initialSession={{ user }}>
        <Consumer />
        <Spy />
      </AuthProvider>
    );

    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(await screen.findByText('1 passkeys')).toBeInTheDocument();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(loadingSeen).not.toContain(true);
    expect(localStorage.getItem('seamlessauth_seen')).toBe('true');
  });

  it('renders signed out without loading when the server found no session', async () => {
    render(
      <AuthProvider apiHost={apiHost} initialSession={null}>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByText('signed out (new)')).toBeInTheDocument();
    await act(async () => {});

    expect(screen.getByText('signed out (new)')).toBeInTheDocument();
  });

  it('picks up a session the server could not see', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ user }) });

    render(
      <AuthProvider apiHost={apiHost} initialSession={null}>
        <Consumer />
      </AuthProvider>
    );

    expect(await screen.findByText(/test@example.com/)).toBeInTheDocument();
  });

  it('seeds the store once and ignores a new initialSession on re-render', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ user }) });
    const { rerender } = render(
      <AuthProvider apiHost={apiHost} initialSession={{ user }}>
        <Consumer />
      </AuthProvider>
    );

    rerender(
      <AuthProvider apiHost={apiHost} initialSession={null}>
        <Consumer />
      </AuthProvider>
    );
    await act(async () => {});

    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
