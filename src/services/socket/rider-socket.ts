import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/constants/env';
import { getAccessToken } from '@/services/auth/auth-client';
import type { ActualizacionUbicacionPedidoPayload } from './socket-contracts';

let socket: Socket | null = null;

function conectar(): Socket {
  if (!socket) {
    socket = io(`${API_URL}/realtime`, {
      // Función, no objeto fijo: en cada (re)conexión pide el token vigente
      // en ese momento, no el de cuando se abrió la app.
      auth: (callback) => {
        getAccessToken().then((token) => callback({ token }));
      },
    });
  }
  return socket;
}

/**
 * Manda la ubicación en vivo del rider para un pedido puntual — no persiste
 * en Postgres (es solo para que `client/` la vea en su mapa), el backend
 * simplemente la reenvía al resto de conectados (`socket_nest.ts`).
 */
export function emitirUbicacion(payload: ActualizacionUbicacionPedidoPayload): void {
  conectar().emit('actualizacion_ubicacion_pedido', payload);
}

/** Corta la conexión — llamar al perder foco la pantalla del mapa, para no dejarla abierta de más. */
export function desconectarSocket(): void {
  socket?.disconnect();
  socket = null;
}
