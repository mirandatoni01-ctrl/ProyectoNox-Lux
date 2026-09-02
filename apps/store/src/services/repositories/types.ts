import type { CartItem, Order, Product } from '../../types';

/**
 * NOX & LUX — Puertos de repositorio del Store (ADR-NL-002).
 * La UI depende de estas interfaces, no de una implementación concreta.
 * Desde NL-11 el catálogo viene de la NOX & LUX API (público) con IndexedDB
 * como caché/fallback offline (last-known-good); el carrito es local y los
 * pedidos se crean contra POST /api/orders (anónimo).
 */

export interface ProductCatalogResult {
  products: Product[];
  /** true cuando la fuente fue la caché local (red caída). */
  fromCache: boolean;
}

/** Catálogo del Store (solo lectura; el alta/baja vive en el Admin, NL-06). */
export interface ProductRepository {
  listActive(): Promise<ProductCatalogResult>;
}

export interface CartRepository {
  getItems(): Promise<CartItem[]>;
  setItems(items: CartItem[]): Promise<void>;
  clear(): Promise<void>;
}

export type CreateOrderInput = {
  name: string;
  whatsappPhone: string;
  items: { productVariantId: string; quantity: number }[];
  /** JWT Bearer opcional (NL-13): si el comprador está logueado, el pedido se
   *  asocia a su cuenta (order.userId) para el historial de compras. */
  token?: string;
};

/** Alta de pedido contra la API (POST /api/orders, anónimo). */
export interface OrderRepository {
  create(draft: CreateOrderInput): Promise<Order>;
}