import { createFetchWithAuth } from '../src/fetchWithAuth';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('createFetchWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds correct URL in web mode', async () => {
    const fetchWithAuth = createFetchWithAuth({
      authMode: 'web',
      authHost: 'https://auth.example.com',
    });

    const mockResponse = { ok: true, status: 200 };
    mockFetch.mockResolvedValueOnce(mockResponse);

    await fetchWithAuth('/login/start');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://auth.example.com/login/start');
    expect(options.credentials).toBe('include');
  });

  it('builds correct URL in server mode', async () => {
    const fetchWithAuth = createFetchWithAuth({
      authMode: 'server',
      authHost: 'https://api.example.com/',
    });

    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    await fetchWithAuth('/auth/me');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/auth/auth/me');
  });

  it('throws error when fetch response is not ok', async () => {
    const fetchWithAuth = createFetchWithAuth({
      authMode: 'web',
      authHost: 'https://auth.example.com',
    });

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(fetchWithAuth('/login')).rejects.toThrow(
      'Failed to make API call to https://auth.example.com/login'
    );
  });
});
