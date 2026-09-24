import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef, type LngLat } from '@maplibre/maplibre-react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRiderLocation } from '@/services/ubicacion/rider-location';
import { obtenerRutaPorCalles } from '@/services/rutas/ruta-osrm';
import { coordenadasDeDestino, type Pedido } from '@/services/pedidos/pedidos-client';

const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/liberty';

/** Centro por defecto si todavía no hay ninguna coordenada real (Chiclayo). */
const CENTRO_DEFECTO: LngLat = [-79.840691, -6.773282];

interface Props {
  pedidos: Pedido[];
}

export function MapaPedidos({ pedidos }: Props) {
  const theme = useTheme();
  const cameraRef = useRef<CameraRef>(null);

  const [enFoco, setEnFoco] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setEnFoco(true);
      return () => setEnFoco(false);
    }, []),
  );

  const { ubicacion, estado, reintentar } = useRiderLocation(pedidos.length > 0 && enFoco);

  // Orden por `actualizadoEn`, no por `id`: un pedido cancelado y vuelto a
  // tomar cambia su actualizadoEn (el backend lo reescribe en cada
  // asignar/cancelar/entregar) aunque el `id` sea el mismo de siempre — así
  // vuelve a contar como "recién tomado" en vez de quedar pegado a su
  // antigüedad original.
  const { intermedios, destinoFinal } = useMemo(() => {
    const ordenados = [...pedidos]
      .map((pedido) => ({ pedido, coordenada: coordenadasDeDestino(pedido.destino) }))
      .filter((item) => item.coordenada !== null)
      .sort((a, b) => new Date(a.pedido.actualizadoEn).getTime() - new Date(b.pedido.actualizadoEn).getTime()) as {
      pedido: Pedido;
      coordenada: { latitude: number; longitude: number };
    }[];

    return {
      intermedios: ordenados.slice(0, -1),
      destinoFinal: ordenados.at(-1) ?? null,
    };
  }, [pedidos]);

  const centroInicial: LngLat = ubicacion
    ? [ubicacion.longitude, ubicacion.latitude]
    : destinoFinal
      ? [destinoFinal.coordenada.longitude, destinoFinal.coordenada.latitude]
      : CENTRO_DEFECTO;

  const firmaPedidos = intermedios
    .map((item) => `${item.pedido.id}:${item.pedido.actualizadoEn}`)
    .concat(destinoFinal ? [`${destinoFinal.pedido.id}:${destinoFinal.pedido.actualizadoEn}`] : [])
    .join(',');
  const hayUbicacionRider = ubicacion !== null;

  // Orden fijo por id ascendente: rider → pedido más antiguo tomado → ... →
  // pedido más reciente tomado (mayor id = último). Sin optimizar el orden
  // de visita (sin TSP/Haversine) — se visita en el orden en que se tomaron.
  const puntosRuta = useMemo(() => {
    const puntos: LngLat[] = [];
    if (ubicacion) {
      puntos.push([ubicacion.longitude, ubicacion.latitude]);
    }
    for (const { coordenada } of intermedios) {
      puntos.push([coordenada.longitude, coordenada.latitude]);
    }
    if (destinoFinal) {
      puntos.push([destinoFinal.coordenada.longitude, destinoFinal.coordenada.latitude]);
    }
    return puntos;
  }, [ubicacion, intermedios, destinoFinal]);

  // Encuadra cámara para que entren todos los puntos — solo cuando cambia el
  // set de pedidos o llega el primer fix de GPS, no en cada tick de ubicación
  // (si no, la cámara "salta" todo el tiempo mientras el rider se mueve).
  useEffect(() => {
    if (puntosRuta.length < 2) {
      return;
    }

    const longitudes = puntosRuta.map((p) => p[0]);
    const latitudes = puntosRuta.map((p) => p[1]);
    const bounds: [number, number, number, number] = [
      Math.min(...longitudes),
      Math.min(...latitudes),
      Math.max(...longitudes),
      Math.max(...latitudes),
    ];

    cameraRef.current?.fitBounds(bounds, {
      padding: { top: 60, left: 60, right: 60, bottom: 60 },
      duration: 500,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaPedidos, hayUbicacionRider]);

  // Geometría real de calle (OSRM) en vez de la recta. Se pide de nuevo
  // cuando cambia el set de pedidos, o cuando el rider se movió lo
  // suficiente (~100m, redondeando a 3 decimales) — no en cada tick de GPS
  // (cada 5s), para no reventar el demo público de OSRM a pedidos.
  const [rutaCalle, setRutaCalle] = useState<LngLat[] | null>(null);
  const riderBucket = ubicacion ? `${ubicacion.latitude.toFixed(3)},${ubicacion.longitude.toFixed(3)}` : 'sin-fix';

  useEffect(() => {
    setRutaCalle(null); // el set de paradas o la posición base cambiaron: la geometría vieja ya no aplica

    if (puntosRuta.length < 2) {
      return;
    }

    let cancelado = false;
    obtenerRutaPorCalles(puntosRuta).then((coordenadas) => {
      if (!cancelado && coordenadas) {
        setRutaCalle(coordenadas);
      }
    });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaPedidos, riderBucket]);

  if (estado === 'denegado') {
    return (
      <View style={[styles.contenedor, styles.mensaje, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.mensajeTexto}>
          Necesitamos tu ubicación para mostrarte en el mapa junto a tus pedidos.
        </ThemedText>
        <Pressable onPress={reintentar} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="smallBold">Dar permiso</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Map style={styles.mapa} mapStyle={ESTILO_MAPA}>
        <Camera ref={cameraRef} initialViewState={{ center: centroInicial, zoom: 13 }} />

        {puntosRuta.length >= 2 && (
          <GeoJSONSource
            id="ruta"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: rutaCalle ?? puntosRuta },
            }}>
            {rutaCalle ? (
              <Layer key="ruta-linea-calle" id="ruta-linea-calle" type="line" paint={{ 'line-color': '#208AEF', 'line-width': 4 }} />
            ) : (
              <Layer key="ruta-linea-recta" id="ruta-linea-recta" type="line" paint={{ 'line-color': '#208AEF', 'line-width': 3 }} />
            )}
          </GeoJSONSource>
        )}

        {ubicacion && (
          <Marker id="rider" lngLat={[ubicacion.longitude, ubicacion.latitude]}>
            <IconoRider />
          </Marker>
        )}

        {intermedios.map(({ pedido, coordenada }) => (
          <Marker key={pedido.id} id={`pedido-${pedido.id}`} lngLat={[coordenada.longitude, coordenada.latitude]}>
            <Punto color="#60646C" etiqueta={String(pedido.id)} />
          </Marker>
        ))}

        {destinoFinal && (
          <Marker
            key={`pedido-${destinoFinal.pedido.id}-destino`}
            id={`pedido-${destinoFinal.pedido.id}-destino`}
            lngLat={[destinoFinal.coordenada.longitude, destinoFinal.coordenada.latitude]}>
            <Punto color="#E0433D" etiqueta={String(destinoFinal.pedido.id)} />
          </Marker>
        )}
      </Map>
    </View>
  );
}

function Punto({ color, etiqueta }: { color: string; etiqueta: string }) {
  return (
    <View style={[styles.punto, { backgroundColor: color }]}>
      <Text style={styles.puntoTexto}>{etiqueta}</Text>
    </View>
  );
}

/** Ubicación en vivo del rider — casco encima de un fondo circular para que se vea sobre cualquier tile. */
function IconoRider() {
  return (
    <View style={styles.casco}>
      <Text style={styles.cascoTexto}>🪖</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { height: 260, borderRadius: Spacing.three, overflow: 'hidden', marginBottom: Spacing.three },
  mapa: { flex: 1 },
  mensaje: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  mensajeTexto: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  punto: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  puntoTexto: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  casco: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#208AEF',
  },
  cascoTexto: { fontSize: 20 },
});
