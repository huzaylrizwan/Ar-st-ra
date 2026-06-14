import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// CSRF token management
// ---------------------------------------------------------------------------

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/csrf-token");
  if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  const data = await res.json();
  csrfToken = data.token as string;
  return csrfToken;
}

/**
 * Drop-in replacement for fetch() that automatically attaches the CSRF token
 * on mutating requests (POST, PUT, PATCH, DELETE) and always sends credentials.
 */
export async function fetchWithCsrf(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers = new Headers(init.headers as HeadersInit | undefined);

  if (needsCsrf) {
    const token = await getCsrfToken();
    headers.set("X-CSRF-Token", token);
  }

  const response = await fetch(input, { credentials: "include", ...init, headers });

  // Bust CSRF cache on 403 so next call fetches a fresh token
  if (response.status === 403 && needsCsrf) {
    csrfToken = null;
  }

  return response;
}

// ---------------------------------------------------------------------------
// apiRequest — used by Banners, FAQ, AdminProductEditor and other pages
// ---------------------------------------------------------------------------

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (data) {
    // Content-Type header is included via the init object below so it gets
    // merged by fetchWithCsrf along with the CSRF header.
    const res = await fetchWithCsrf(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await throwIfResNotOk(res);
    return res;
  }

  const res = await fetchWithCsrf(url, { method });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetchWithCsrf(queryKey.join("/") as string);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
