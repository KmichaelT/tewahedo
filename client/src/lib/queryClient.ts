import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${res.status} ${res.statusText} - ${text}`);
    console.error(`Request URL: ${res.url}, Method: ${res.type}`);
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get Firebase token for authentication
async function getAuthToken(): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      return await currentUser.getIdToken(true);
    }
  } catch (error) {
    console.error("Error getting Firebase token:", error);
  }
  return null;
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Get Firebase auth token for this request
  const token = await getAuthToken();
  
  // Prepare headers with auth token if available
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("Including Firebase auth token in request");
  }
  
  // Log what we're doing for debugging
  console.log(`Making ${method} request to ${url}`);
  if (data) {
    console.log("Request data:", data);
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // For methods like DELETE that might not return a body
  if (res.status === 204) {
    return null as T;
  }
  
  // Parse JSON for all other responses
  const result = await res.json();
  return result as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      console.log("Making query to:", queryKey[0]);
      
      // Get Firebase auth token for this request
      const token = await getAuthToken();
      
      // Prepare headers with auth token if available
      const headers: HeadersInit = {};
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("Including Firebase auth token in query");
      }
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });

      console.log("Response status:", res.status);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Unauthorized but returning null as requested");
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log("Query response data:", data);
      return data;
    } catch (error) {
      console.error("Query error:", error);
      throw error;
    }
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
