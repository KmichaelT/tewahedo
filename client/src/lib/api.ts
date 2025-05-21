// API utility for making requests to the backend

/**
 * Get the base URL for API requests
 * In production, API requests go to the same domain
 * In development, they go to the development server
 */
export const getApiBaseUrl = () => {
  // In production (Vercel), the API is on the same domain
  // In development, we use the local server
  return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
};

/**
 * Make a GET request to the API
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/api${endpoint}`);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make a POST request to the API
 */
export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make a PUT request to the API
 */
export async function apiPut<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/api${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make a DELETE request to the API
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/api${endpoint}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}