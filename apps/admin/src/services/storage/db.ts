import Dexie, { type Table } from 'dexie';
import type { CartItem, Product } from '../../types';

/**
 * NOX & LUX — Base de datos local (IndexedDB vía Dexie).
 *
 * Comparte el MISMO esquema y nombre que el Store (`nox-lux-db`, ADR-NL-002):
 * mientras el CRUD no viaje por API (NL-07), "crear en Admin → ver en Store"
 * funciona cuando ambas apps comparten origen. En dev (puertos 5173/5174 son
 * orígenes distintos) cada puerto tiene su propia copia.
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
  }
}

export const db = new NoxLuxDatabase();