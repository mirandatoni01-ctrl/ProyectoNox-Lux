import type { Order, OrderStatus, Product, ProductImage, StockEntry } from '../../types';

/**
 * NOX & LUX — Puertos de repositorio del Admin.
 * La UI depende de estas interfaces (ADR-NL-002), no de una implementación
 * concreta. Local usa IndexedDB; el backend (NL-07) implementará el mismo
 * contrato vía REST sin tocar la UI.
 */
export interface ProductRepository {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | undefined>;
  create(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  toggleActive(id: string): Promise<Product | undefined>;
  removeImage(productId: string, imageId: string): Promise<void>;
}

/**
 * Inventario (NL-08): lectura de stock por variante y ajustes de stockOnHand.
 * `available` (disponible) lo calcula el API (on_hand − reserved).
 */
export interface InventoryRepository {
  list(): Promise<StockEntry[]>;
  setStock(variantId: string, stockOnHand: number, reason?: string): Promise<StockEntry>;
  adjustStock(variantId: string, delta: number, reason?: string): Promise<StockEntry>;
}

/**
 * Media (NL-09): gestión de imágenes reales en el backend.
 * `LocalMediaRepository` usa object URLs en dev; `ApiMediaRepository` sube a
 * la NOX & LUX API (storage local servido por el API) y lista/borra.
 */
export interface MediaRepository {
  upload(file: File): Promise<ProductImage>;
  list(): Promise<ProductImage[]>;
  remove(mediaId: string): Promise<void>;
}

/**
 * Pedidos (NL-10): lectura y transición de estado contra la NOX & LUX API.
 * El alta de pedido la hace el Store (POST /api/orders, anónimo); el Admin
 * solo gestiona (pedidos:ver / pedidos:gestionar).
 */
export interface OrderRepository {
  list(status?: OrderStatus): Promise<Order[]>;
  getById(id: string): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
}