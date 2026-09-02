import { authedRequest } from '../../api/client';
import type { Order, OrderStatus } from '../../../types';
import type { OrderRepository } from '../types';
import { type ApiOrder, fromApiOrder } from './mappers';

/**
 * Repositorio de pedidos sobre la NOX & LUX API (NL-10).
 * Endpoints: GET /api/orders (listado admin), GET /api/orders/:id (detalle),
 * PATCH /api/orders/:id/status (transición). Requieren pedidos:ver/
 * pedidos:gestionar. El alta la realiza el Store (POST /api/orders, anónimo).
 */
export class ApiOrderRepository implements OrderRepository {
  async list(status?: OrderStatus): Promise<Order[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const result = await authedRequest<ApiOrder[]>(`/api/orders${query}`);
    if (!result.ok) throw result.error;
    return result.data.map(fromApiOrder);
  }

  async getById(id: string): Promise<Order> {
    const result = await authedRequest<ApiOrder>(`/api/orders/${id}`);
    if (!result.ok) throw result.error;
    return fromApiOrder(result.data);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const result = await authedRequest<ApiOrder>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!result.ok) throw result.error;
    return fromApiOrder(result.data);
  }
}