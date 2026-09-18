/**
 * Variables de entorno públicas (prefijo EXPO_PUBLIC_, ver .env.example en
 * la raíz de rider/). Expo las inyecta en el bundle en build time — no hay
 * nada "secreto" acá, son valores públicos por naturaleza (igual que
 * GOOGLE_CLIENT_ID en el client Angular).
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const GOOGLE_CLIENT_ID_IOS =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';

export const GOOGLE_CLIENT_ID_ANDROID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';

export const GOOGLE_CLIENT_ID_WEB =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';
