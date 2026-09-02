import { db } from '../../storage/db';
import type { CartItem } from '../../../types';
import type { CartRepository } from '../types';

/**
 * Implementación local (IndexedDB) del port de carrito.
 * Cada cambio se persiste (setItems), garantizando supervivencia al recargar.
 */
export class LocalCartRepository implements CartRepository {
  async getItems(): Promise<CartItem[]> {
    return db.cartItems.toArray();
  }

  async setItems(items: CartItem[]): Promise<void> {
    await db.cartItems.clear();
    if (items.length > 0) {
      await db.cartItems.bulkPut(items);
    }
  }

  async clear(): Promise<void> {
    await db.cartItems.clear();
  }
}