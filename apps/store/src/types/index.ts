/**
 * NOX & LUX — Tipos del Store.
 *
 * Los tipos de dominio (Material, Category, Role, Product, ProductVariant,
 * CartItem) viven en el paquete compartido `@nox-lux/shared` (fuente de verdad
 * para STORE, ADMIN y BACKEND). Aquí se re-exportan y se añaden los tipos
 * puramente de UI del Store.
 *
 * Ver docs/03-architecture/ARCHITECTURE_BLUEPRINT_V1.md.
 */

export type {
  Material,
  Category,
  Role,
  Product,
  ProductVariant,
  CartItem,
  Order,
} from '@nox-lux/shared';

// ---------------------------------------------------------------------------
// Tipos de UI del Store (no compartidos)
// ---------------------------------------------------------------------------

/**
 * Pestañas del Store. Desde NL-06 la gestión administrativa vive en el panel
 * independiente `apps/admin` (ADR-NL-002/006): aquí solo quedan las vistas de
 * comprador (catálogo, carrito y perfil/cuenta, NL-13).
 */
export type CustomerTab = 'catalog' | 'cart' | 'profile';
export type Tab = CustomerTab;

/** Usuario del Store tal como lo devuelve GET /api/auth/me (NL-13). */
export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  provider: string | null;
  roles: string[];
  permissions: string[];
}
