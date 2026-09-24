import type { LngLat } from '@maplibre/maplibre-react-native';
import { OSRM_URL } from '@/constants/env';

/**
 * Pide a OSRM la geometría real de calle para el trayecto, EN EL ORDEN dado
 * — usa el endpoint `route`, no `trip`, justo para no optimizar el orden de
 * paradas (ver mapa-pedidos.tsx: el orden ya viene fijo por `actualizadoEn`,
 * no hay que tocarlo).
 *
 * `OSRM_URL` apunta al demo público por default (gratis, sin API key, pero
 * solo para pruebas) — para producción, self-hostear y setear
 * `EXPO_PUBLIC_OSRM_URL` (ver OSRM_SELFHOST.md en la raíz del repo).
 *
 * Devuelve `null` si falla (sin internet, rate limit, OSRM no encuentra
 * ruta, etc.) — quien llama debe caer de vuelta a la línea recta, no romper
 * el mapa.
 */
export async function obtenerRutaPorCalles(puntos: LngLat[]): Promise<LngLat[] | null> {
  if (puntos.length < 2) {
    return null;
  }

  const coordenadas = puntos.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_URL}/route/v1/driving/${coordenadas}?overview=full&geometries=geojson`;

  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      return null;
    }
    const datos = (await respuesta.json()) as {
      code: string;
      routes?: { geometry: { coordinates: LngLat[] } }[];
    };
    if (datos.code !== 'Ok' || !datos.routes?.length) {
      return null;
    }
    return datos.routes[0].geometry.coordinates;
  } catch {
    return null;
  }
}
