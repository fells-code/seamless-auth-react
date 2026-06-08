/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createFetchWithAuth } from '../src/fetchWithAuth';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('createFetchWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds correct server-adapter URL', async () => {
    const fetchWithAuth = createFetchWithAuth({
      authHost: 'https://auth.example.com',
    });

    const mockResponse = { ok: true, status: 200 };
    mockFetch.mockResolvedValueOnce(mockResponse);

    await fetchWithAuth('/login/start');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://auth.example.com/auth/login/start');
    expect(options.credentials).toBe('include');
  });

  it('builds correct URL when auth host has a trailing slash', async () => {
    const fetchWithAuth = createFetchWithAuth({
      authHost: 'https://api.example.com/',
    });

    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    await fetchWithAuth('/users/me');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/auth/users/me');
  });

  it('builds correct URL when auth host has no trailing slash', async () => {
    const fetchWithAuth = createFetchWithAuth({
      authHost: 'https://api.example.com',
    });

    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    await fetchWithAuth('users/me');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/auth/users/me');
  });

  it('returns the raw response when fetch response is not ok', async () => {
    const fetchWithAuth = createFetchWithAuth({
      authHost: 'https://auth.example.com',
    });

    const response = { ok: false, status: 500 };
    mockFetch.mockResolvedValueOnce(response);

    await expect(fetchWithAuth('/login')).resolves.toBe(response);
  });
});
