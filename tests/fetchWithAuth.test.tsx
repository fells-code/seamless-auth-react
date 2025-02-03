import { fetchWithAuth } from "../src/fetchWithAuth";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchWithAuth", () => {
  const apiHost = "http://localhost:5000/";
  const mockUrl = "http://localhost:5000/test";
  const mockResponse = { success: true };

  it("throws an error if no auth token is available", async () => {
    await expect(fetchWithAuth(mockUrl, apiHost)).rejects.toThrow(
      "No token available. Please log in again."
    );
  });

  it("makes a request with the auth token", async () => {
    localStorage.setItem("authToken", "test-token");
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => mockResponse,
    });

    const response = await fetchWithAuth(mockUrl, apiHost);
    expect(fetch).toHaveBeenCalledWith(
      mockUrl,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
    expect(response.ok).toBe(true);
  });

  it("attempts to refresh the token if a 403 response is received", async () => {
    localStorage.setItem("authToken", "old-token");
    localStorage.setItem("refreshToken", "refresh-token");

    (fetch as jest.Mock)
      .mockResolvedValueOnce({ status: 403 }) // First request fails with 403
      .mockResolvedValueOnce({
        ok: true,
        json: () => ({ accessToken: "new-token" }),
      }) // Refresh token request
      .mockResolvedValueOnce({ ok: true, json: () => mockResponse }); // Retried request

    const response = await fetchWithAuth(mockUrl, apiHost);
    expect(localStorage.getItem("authToken")).toBe("new-token");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${apiHost}auth/refresh-token`,
      expect.any(Object)
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      mockUrl,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer new-token" }),
      })
    );
    expect(response.ok).toBe(true);
  });

  it("removes tokens and throws an error if token refresh fails", async () => {
    localStorage.setItem("authToken", "old-token");
    localStorage.setItem("refreshToken", "refresh-token");

    (fetch as jest.Mock)
      .mockResolvedValueOnce({ status: 403 }) // First request fails
      .mockResolvedValueOnce({ ok: false }); // Refresh token request fails

    await expect(fetchWithAuth(mockUrl, apiHost)).rejects.toThrow(
      "Session expired. Please log in again."
    );
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });
});
