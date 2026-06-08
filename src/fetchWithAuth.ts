/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

interface FetchWithAuthOptions {
  authHost?: string;
}

export const createFetchWithAuth = (opts: FetchWithAuthOptions) => {
  const { authHost } = opts;

  return async function fetchWithAuth(
    input: string,
    init?: RequestInit
  ): Promise<Response> {
    const host = authHost?.replace(/\/+$/, '') ?? '';
    const path = input.startsWith('/') ? input : `/${input}`;

    const url = `${host}/auth${path}`;

    const requestInit: RequestInit = {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    };

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      console.warn('Auth fetch failed:', response.status);
    }

    return response;
  };
};
