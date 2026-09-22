import { API_URL } from '@/constants/env';
import { getAccessToken, refreshSession } from './auth/auth-client';

const AUTH_ENDPOINTS = ['/auth/login/google', '/auth/refresh', '/auth/logout'];

/** El caller debe atraparlo y limpiar la sesión local (ver useSession().clearLocalSession). */
export class SesionExpiradaError extends Error {}

async function fetchConToken(path: string, options: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

/** Igual que client/auth.interceptor.ts: reintenta una vez con refresh en un 401. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetchConToken(path, options);

  if (response.status !== 401 || AUTH_ENDPOINTS.includes(path)) {
    return response;
  }

  try {
    await refreshSession();
  } catch {
    throw new SesionExpiradaError('Sesión expirada');
  }

  return fetchConToken(path, options);
}

export async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options);

  if (response.status === 401) {
    throw new SesionExpiradaError('Sesión expirada');
  }
  if (!response.ok) {
    throw new Error(`${path} respondió ${response.status}`);
  }

  return response.json() as Promise<T>;
}
