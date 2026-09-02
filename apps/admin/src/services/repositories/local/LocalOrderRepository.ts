import type { Order } from '../../../types';
import type { OrderRepository } from '../types';

/**
 * Implementación local (dev) del port de pedidos.
 * Los pedidos solo viven en la NOX & LUX API (PostgreSQL); en modo local no hay
 * datos que listar y las transiciones requieren pedidos:gestionar contra la API.
 */
export class LocalOrderRepository implements OrderRepository {
  async list(): Promise<Order[]> {
    return [];
  }

  async getById(): Promise<Order> {
    throw new Error('Los pedidos se gestionan contra la NOX & LUX API (VITE_AUTH_MODE=api).');
  }

  async updateStatus(): Promise<Order> {
    throw new Error('Los pedidos se gestionan contra la NOX & LUX API (VITE_AUTH_MODE=api).');
  }
}