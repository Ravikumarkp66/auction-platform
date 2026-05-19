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
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return response.json();
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
