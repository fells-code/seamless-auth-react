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

    // Only declare a JSON content type when a body is actually sent. Some
    // proxies reject a bodyless GET that advertises a request content type.
    const hasBody = init?.body != null;

    const requestInit: RequestInit = {
      ...init,
      credentials: 'include',
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    };

    return fetch(url, requestInit);
  };
};
