export const fetchWithAuth = async (
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> => {
  const requestInit: RequestInit = {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers || {}),
    },
  };

  const response = await fetch(input, requestInit);

  if (response.ok) {
    return response;
  }

  throw new Error(`Failed to make API call to auth server.`);
};
