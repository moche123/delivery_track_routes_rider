import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export type EstadoUbicacion = 'cargando' | 'concedido' | 'denegado';

/**
 * Ubicación en vivo del rider vía `watchPositionAsync`. Solo se suscribe
 * mientras `activo` es true — apagalo cuando la pantalla pierde foco o no
 * hay pedidos que mostrar en el mapa, para no gastar batería sin necesidad.
 */
export function useRiderLocation(activo: boolean) {
  const [ubicacion, setUbicacion] = useState<Coordenada | null>(null);
  const [estado, setEstado] = useState<EstadoUbicacion>('cargando');

  const pedirPermiso = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setEstado(status === 'granted' ? 'concedido' : 'denegado');
    return status === 'granted';
  }, []);

  useEffect(() => {
    if (!activo) {
      return;
    }

    let subscripcion: Location.LocationSubscription | undefined;
    let cancelado = false;

    (async () => {
      const concedido = await pedirPermiso();
      if (!concedido || cancelado) {
        return;
      }
      subscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
        (posicion) => {
          setUbicacion({
            latitude: posicion.coords.latitude,
            longitude: posicion.coords.longitude,
          });
        },
      );
    })();

    return () => {
      cancelado = true;
      subscripcion?.remove();
    };
  }, [activo, pedirPermiso]);

  return { ubicacion, estado, reintentar: pedirPermiso };
}
