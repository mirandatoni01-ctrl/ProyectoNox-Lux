import Dexie, { type Table } from 'dexie';
import type { CartItem, Product } from '../../types';

/**
 * NOX & LUX — Base de datos local (IndexedDB vía Dexie).
 * Desde NL-11 `products` es la CACHÉ del catálogo de la API (last-known-good);
 * `cartItems` persiste el carrito del comprador. La versión incrementa al
 * evolucionar el esquema (migraciones).
 */
export class NoxLuxDatabase extends Dexie {
  products!: Table<Product, string>;
  cartItems!: Table<CartItem, string>;

  constructor() {
    super('nox-lux-db');
    this.version(1).stores({
      products: 'id',
      cartItems: 'id',
    });
    // NL-11: CartItem ahora exige `productVariantId` (id real de la variante)
    // para crear pedidos. Los carritos guardados antes no lo tienen y no son
    // recuperables → se descartan en la migración.
    this.version(2).stores({
      products: 'id',
      cartItems: 'id',
    }).upgrade(async (tx) => {
      await tx.table('cartItems').clear();
    });
  }
}

export const db = new NoxLuxDatabase();