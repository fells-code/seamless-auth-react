export type AuthMode = 'web' | 'server';

interface FetchWithAuthOptions {
  authMode: AuthMode;
  apiHost?: string; // e.g. "https://api.client.com"
  authHost?: string; // e.g. "https://auth.client.com" (for web mode)
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
      credentials: 'include', // allows cookies to flow
      headers: {
        ...(init?.headers || {}),
      },
    };

    const response = await fetch(url, requestInit);

    if (response.ok) return response;

    // Optional: auto-logout or token refresh hook
    console.error('Auth fetch failed:', response.status, url);
    throw new Error(`Failed to make API call to ${url}`);
  };
};
