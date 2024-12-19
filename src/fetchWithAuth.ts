export const fetchWithAuth = async (
  input: RequestInfo,
  apiHost: string,
  init?: RequestInit
): Promise<Response> => {
  const authToken = localStorage.getItem("authToken");

  const requestInit = {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${authToken}`,
    },
  };

  let response = await fetch(input, requestInit);

  if (response.status === 403) {
    // Attempt to refresh the token
    console.log("Attempting to refresh token...");
    const refreshToken = localStorage.getItem("refreshToken");
    console.log("Refresh token...", refreshToken);

    if (!refreshToken) {
      throw new Error("No refresh token available. Please log in again.");
    }

    const refreshResponse = await fetch(`${apiHost}api/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      localStorage.setItem("authToken", refreshData.accessToken);

      // Retry the original request with the new token
      requestInit.headers.Authorization = `Bearer ${refreshData.accessToken}`;
      response = await fetch(input, requestInit);
    } else {
      // Refresh token failed, force logout or handle accordingly
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
};
