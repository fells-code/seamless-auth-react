import { fetchWithAuth } from '../src/fetchWithAuth';

describe('fetchWithAuth', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('should call fetch with credentials=include and pass through headers', async () => {
    const mockResponse = { ok: true } as Response;
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const input = 'https://api.example.com/test';
    const init = { headers: { Authorization: 'Bearer token' } };

    const result = await fetchWithAuth(input, init);

    expect(global.fetch).toHaveBeenCalledWith(input, {
      ...init,
      credentials: 'include',
      headers: { Authorization: 'Bearer token' },
    });

    expect(result).toBe(mockResponse);
  });

  it('should include credentials even if init is undefined', async () => {
    const mockResponse = { ok: true } as Response;
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await fetchWithAuth('https://api.example.com/without-init');

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/without-init', {
      credentials: 'include',
      headers: {},
    });
  });

  it('should throw an error if response.ok is false', async () => {
    const mockResponse = { ok: false } as Response;
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(fetchWithAuth('https://api.example.com/fail')).rejects.toThrow(
      'Failed to make API call to auth server.'
    );
  });

  it('should propagate fetch rejections (network errors)', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

    await expect(fetchWithAuth('https://api.example.com/fail')).rejects.toThrow(
      'Network down'
    );
  });
});
