export const fetchWithAuth = async (
  input: RequestInfo,
  apiHost: string,
  init?: RequestInit
): Promise<Response> => {
  const requestInit: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers || {}),
    },
  };

  let response = await fetch(input, requestInit);

  if (response.status === 403) {
    // Attempt to refresh the token
    const refreshResponse = await fetch(`${apiHost}auth/refresh-token`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (refreshResponse.ok) {
      // Retry the original request with the new token
      response = await fetch(input, requestInit);
    } else {
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
};
