import type { StockEntry } from '../../../types';
import type { InventoryRepository } from '../types';

/**
 * Implementación local (dev) del port de inventario.
 * El modo local no gestiona stock (fuente de verdad: la API en modo
 * `VITE_AUTH_MODE=api`); devuelve lista vacía y mutaciones no-op.
 */
export class LocalInventoryRepository implements InventoryRepository {
  async list(): Promise<StockEntry[]> {
    return [];
  }

  async setStock(): Promise<StockEntry> {
    throw new Error(
      'El inventario se gestiona contra la NOX & LUX API (VITE_AUTH_MODE=api).',
    );
  }

  async adjustStock(): Promise<StockEntry> {
    throw new Error(
      'El inventario se gestiona contra la NOX & LUX API (VITE_AUTH_MODE=api).',
    );
  }
}