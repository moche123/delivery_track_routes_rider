import { apiJson } from '../api';

export type PedidoEstado = 'no_asignado' | 'asignado' | 'eliminado' | 'entregado';

export interface Pedido {
  id: number;
  nombre: string;
  ubicacion: string | null;
  estado: PedidoEstado;
  destino: string;
  foto: string | null;
}

export function listarDisponibles(): Promise<Pedido[]> {
  return apiJson<Pedido[]>('/pedidos/disponibles');
}

export function listarMios(): Promise<Pedido[]> {
  return apiJson<Pedido[]>('/pedidos/mios');
}

export function asignar(id: number): Promise<Pedido> {
  return apiJson<Pedido>(`/pedidos/${id}/asignar`, { method: 'POST' });
}

export function cancelarAsignacion(id: number): Promise<Pedido> {
  return apiJson<Pedido>(`/pedidos/${id}/cancelar-asignacion`, { method: 'POST' });
}

export function entregar(id: number): Promise<Pedido> {
  return apiJson<Pedido>(`/pedidos/${id}/entregar`, { method: 'PATCH' });
}

/** destino tiene formato "ubigeo|lat,lng|lugar" — ver client/pedidos.ts. */
export function lugarDeDestino(destino: string): { ubigeo: string; latlng: string; lugar: string } {
  const [ ubigeo,latlng , lugar] = destino.split('|');
  return { ubigeo, latlng, lugar };
}

/** Parsea el segmento lat,lng de `destino` a números. `null` si el formato no es válido. */
export function coordenadasDeDestino(destino: string): { latitude: number; longitude: number } | null {
  const { latlng } = lugarDeDestino(destino);
  const [lat, lng] = latlng.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}
