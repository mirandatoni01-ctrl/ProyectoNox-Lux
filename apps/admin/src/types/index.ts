/**
 * NOX & LUX — Tipos del Admin Panel.
 *
 * Tipos de dominio compartidos desde `@nox-lux/shared` (fuente de verdad para
 * STORE, ADMIN y BACKEND) + tipos puramente de UI del Admin.
 */

import type { Material } from '@nox-lux/shared';

export type {
  CartItem,
  Material,
  Category,
  Product,
  ProductVariant,
  ProductImage,
  Order,
  OrderLineItem,
  OrderStatus,
} from '@nox-lux/shared';

// ---------------------------------------------------------------------------
// Tipos de UI del Admin (no compartidos)
// ---------------------------------------------------------------------------

/** Módulo del panel: productos (NL-06) y placeholders de bloques futuros. */
export type AdminModule =
  | 'productos'
  | 'inventario'
  | 'pedidos'
  | 'clientes'
  | 'media'
  | 'usuarios'
  | 'tickets';

/** Entrada de stock de una variante (contrato del endpoint GET /api/inventory, NL-08). */
export interface StockEntry {
  productVariantId: string;
  sku: string;
  productId: string;
  productName: string;
  material: Material;
  size: string;
  status: string;
  stockOnHand: number;
  reserved: number;
  available: number;
}

/** Usuario del sistema (gestión de usuarios, NL-13): GET/PATCH /api/users. */
export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  permissions?: string[];
}

/** Estados de un ticket de "Contact Us" (NL-13). */
export type TicketStatusValue = 'new' | 'in_progress' | 'resolved' | 'closed';

/** Ticket de contacto (formulario "Contact Us" del Store): /api/tickets. */
export interface ContactTicket {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: TicketStatusValue;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}