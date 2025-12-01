export type AuthMode = 'web' | 'server';

interface FetchWithAuthOptions {
  authMode: AuthMode;
  authHost?: string;
}

export const createFetchWithAuth = (opts: FetchWithAuthOptions) => {
  const { authMode, authHost } = opts;

  return async function fetchWithAuth(
    input: string,
    init?: RequestInit
  ): Promise<Response> {
    const base = authMode === 'server' ? `auth` : '';

    const url = `${authHost}${base}${input.startsWith('/') ? input : `/${input}`}`;

    const requestInit: RequestInit = {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    };

    const response = await fetch(url, requestInit);

    if (response.ok) return response;

    console.warn('Auth fetch failed:', response.status, url);
    throw new Error(`Failed to make API call to ${url}`);
  };
};
