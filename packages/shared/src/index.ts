/**
 * NOX & LUX — @nox-lux/shared
 * Tipos y utilidades compartidos entre STORE, ADMIN y BACKEND.
 * Consumidos directamente como fuente TypeScript (sin paso de build).
 * Ver docs/03-architecture/DATA_MODEL.md y ARCHITECTURE_BLUEPRINT_V1.md.
 */

// ---------------------------------------------------------------------------
// Materiales y categorías (catálogo)
// ---------------------------------------------------------------------------

export type Material = 'STAINLESS_STEEL' | 'COVERGOLD' | 'RHODIUM';

export type Category =
  | 'anillos'
  | 'cadenas'
  | 'aretes'
  | 'pulseras';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type Role = 'CUSTOMER' | 'ADMIN';

// ---------------------------------------------------------------------------
// Productos y variantes
// ---------------------------------------------------------------------------

export interface ProductVariant {
  material: Material;
  size: string;
  stock: number;
  priceOverride: number;
  /** Identificador real de la variante (REST, NL-07). El Store lo usa como
   *  `productVariantId` para crear pedidos (NL-11). */
  id?: string;
  /** Unidades reservadas por pedidos (ledger). Disponible = stock − reserved. */
  reserved?: number;
  sku?: string;
  status?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  material: Material;
  description: string;
  variants: ProductVariant[];
  isActive: boolean;
  imageUrl: string;
  images?: ProductImage[];
}

/**
 * Imagen de producto (NL-09): muchas por producto (galería) con una primaria.
 * `url` puede ser una URL pública (legacy) o una media del API
 * (`/api/media/file/<key>` para el backend local).
 */
export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  position?: number;
  isPrimary?: boolean;
}

// ---------------------------------------------------------------------------
// Carrito (pedido en construcción)
// ---------------------------------------------------------------------------

export interface CartItem {
  id: string;
  productId: string;
  /** Id real de la variante (REST, NL-07). Se envía como `productVariantId`
   *  en POST /api/orders (NL-11). */
  productVariantId: string;
  name: string;
  material: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// Pedidos (NL-10)
// ---------------------------------------------------------------------------

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface OrderLineItem {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  name: string;
  material: string;
  size: string;
  imageUrl: string | null;
}

/**
 * Pedido tal como lo expone la NOX & LUX API (NL-10). `totalAmount` y precios
 * de items se calculan server-side (priceOverride ?? basePrice); el cliente
 * nunca envía precios.
 */
export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  whatsappPhone: string;
  source: string;
  customer: { id?: string; name: string; phone: string } | null;
  items: OrderLineItem[];
  createdAt: string;
  updatedAt: string;
  /** Presente en la respuesta de POST /api/orders: enlace wa.me del negocio
   *  con el mensaje construido en el servidor (NL-10/11). */
  whatsappLink?: string;
}
