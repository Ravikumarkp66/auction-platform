import { storage, AUTH_TOKEN_KEY } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';

async function getHeaders() {
  const token = await storage.getItem(AUTH_TOKEN_KEY);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  async get(endpoint: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });
    return response.json();
  },

  async post(endpoint: string, body: any) {
    const headers = await getHeaders();
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      return await response.json();
    } catch (error: any) {
      console.error(`API POST Error [${endpoint}]:`, error);
      return { 
        success: false, 
        message: `Network connection failed. Make sure your server is running and EXPO_PUBLIC_API_URL (${API_URL}) is correct.` 
      };
    }
  },

  async patch(endpoint: string, body: any) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
  },

  async delete(endpoint: string) {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  }
};
