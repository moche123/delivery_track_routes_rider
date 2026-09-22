import { API_URL } from '@/constants/env';
import { tokenStorage } from './token-storage';

export interface AuthUser {
  id: number;
  nombre: string;
  foto: string | null;
  email: string | null;
}

interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const ACCESS_TOKEN_KEY = 'rider_access_token';
const REFRESH_TOKEN_KEY = 'rider_refresh_token';
const REFRESH_ISSUED_AT_KEY = 'rider_refresh_token_issued_at';
const USER_KEY = 'rider_user';
const EXPIRY_SKEW_MS = 10_000;
/** El refresh token es opaco (string aleatorio) — su TTL real vive en la DB.
 * Acá se aproxima desde el momento en que se emitió la sesión y el TTL por
 * defecto del backend (7 días), igual que client/src/app/services/auth/auth.ts. */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let refreshPromise: Promise<string> | null = null;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${path} respondió ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

function decodeToken(token: string): { exp?: number } | null {
  try {
    return JSON.parse(decodeBase64Url(token.split('.')[1])) as { exp?: number };
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) {
    return true;
  }
  return payload.exp * 1000 <= Date.now() + EXPIRY_SKEW_MS;
}

async function storeSession(session: SessionResult): Promise<void> {
  await tokenStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  await tokenStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  await tokenStorage.setItem(REFRESH_ISSUED_AT_KEY, String(Date.now()));
  await tokenStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export async function getAccessToken(): Promise<string | null> {
  return tokenStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return tokenStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Ms que restan del access token vigente, o null si no hay token o no expira. */
export async function getAccessTokenTtlMs(): Promise<number | null> {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }
  const payload = decodeToken(token);
  if (!payload?.exp) {
    return null;
  }
  return payload.exp * 1000 - Date.now();
}

/** Ms que restan del refresh token (aproximado, ver REFRESH_TOKEN_TTL_MS). */
export async function getRefreshTokenTtlMs(): Promise<number | null> {
  const [issuedAtRaw, refreshToken] = await Promise.all([
    tokenStorage.getItem(REFRESH_ISSUED_AT_KEY),
    getRefreshToken(),
  ]);

  if (!refreshToken) {
    return null;
  }

  let issuedAt = Number(issuedAtRaw);
  if (!issuedAt) {
    // Sesión guardada antes de que existiera REFRESH_ISSUED_AT_KEY (o storage
    // corrupto): no hay forma de saber cuándo se emitió de verdad, así que se
    // aproxima desde ahora en vez de dejar el countdown vacío para siempre.
    issuedAt = Date.now();
    await tokenStorage.setItem(REFRESH_ISSUED_AT_KEY, String(issuedAt));
  }

  return issuedAt + REFRESH_TOKEN_TTL_MS - Date.now();
}

async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await tokenStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await tokenStorage.deleteItem(ACCESS_TOKEN_KEY);
  await tokenStorage.deleteItem(REFRESH_TOKEN_KEY);
  await tokenStorage.deleteItem(REFRESH_ISSUED_AT_KEY);
  await tokenStorage.deleteItem(USER_KEY);
}

/** tipo: 'driver' fijo — este es el rider, no un cliente. Ver PLAN_PASO0.md. */
export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  const session = await postJson<SessionResult>('/auth/login/google', {
    token: idToken,
    tipo: 'driver',
  });
  await storeSession(session);
  return session.user;
}

export async function logout(): Promise<void> {
  const refreshToken = await tokenStorage.getItem(REFRESH_TOKEN_KEY);

  if (refreshToken) {
    try {
      await postJson('/auth/logout', { refreshToken });
    } catch {
      // el logout local no depende de la red
    }
  }

  await clearSession();
}

/** Deduplica refresh concurrentes: varios 401 simultáneos comparten la misma promesa. */
export function refreshSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function runRefresh(): Promise<string> {
  const refreshToken = await tokenStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No hay refresh token');
  }

  const session = await postJson<SessionResult>('/auth/refresh', { refreshToken });
  await storeSession(session);
  return session.accessToken;
}

/**
 * Se llama al iniciar la app. Devuelve el usuario si hay sesión recuperable,
 * o null si no (y limpia cualquier resto de sesión inválida).
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const accessToken = await getAccessToken();

  if (accessToken && !isExpired(accessToken)) {
    return getStoredUser();
  }

  try {
    await refreshSession();
    return getStoredUser();
  } catch {
    await clearSession();
    return null;
  }
}
