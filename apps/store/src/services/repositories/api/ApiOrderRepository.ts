import { request } from '../../api/client';
import type { Order } from '../../../types';
import type { CreateOrderInput } from '../types';
import { type ApiOrder, fromApiOrder } from './mappers';

/**
 * Alta de pedido del Store (NL-11): POST /api/orders es ANÓNIMO y calcula
 * precios server-side (S-06). El cliente solo envía variante + cantidad;
 * el servidor responde Order con `whatsappLink`. Si el comprador está
 * logueado (NL-13), se envía su JWT para vincular el pedido (order.userId).
 */
export class ApiOrderRepository {
  async create(draft: CreateOrderInput): Promise<Order> {
    const headers: Record<string, string> = {};
    if (draft.token) headers.Authorization = `Bearer ${draft.token}`;
    const result = await request<ApiOrder>('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: draft.name,
        whatsappPhone: draft.whatsappPhone,
        items: draft.items,
      }),
    });
    if (!result.ok) throw result.error;
    return fromApiOrder(result.data);
  }
}