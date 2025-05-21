import { QueryClient } from "@tanstack/react-query";

// Custom fetch wrapper for React Query
export async function apiRequest(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Terjadi kesalahan pada server",
    }));
    throw new Error(error.message || "Terjadi kesalahan pada server");
  }

  return response.json();
}

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        if (typeof url !== "string") {
          throw new Error("Invalid query key: must be a string or start with a string");
        }
        return apiRequest(url);
      },
    },
  },
});