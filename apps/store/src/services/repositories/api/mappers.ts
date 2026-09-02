import type { Material, Order, Product } from '../../../types';
import { absoluteMediaUrl } from '../../api/client';

/**
 * NOX & LUX Store — mapero entre el contrato REST de la NOX & LUX API y el
 * dominio del Store (NL-11). El catálogo público devuelve por variante
 * `id`/`stock`/`reserved` (disponible = stock − reserved) y las imágenes de
 * media relativas (`/api/media/file/...`) que aquí se resuelven absolutas.
 */

export interface ApiProductVariant {
  id: string;
  sku: string;
  material: Material;
  size: string;
  priceOverride: number | null;
  status: string;
  stock: number;
  reserved: number;
}

export interface ApiProductImage {
  id: string;
  url: string;
  alt?: string | null;
  position?: number | null;
  isPrimary?: boolean | null;
}

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  isActive: boolean;
  basePrice: number;
  materialDefault: Material;
  imageUrl: string | null;
  images: ApiProductImage[];
  variants: ApiProductVariant[];
}

/** Producto del API -> del Store (variante con id real + stock/reserved). */
export function fromApiProduct(dto: ApiProduct): Product {
  const primary = dto.images.find((img) => img.isPrimary) ?? dto.images[0];
  const imageUrl = absoluteMediaUrl(dto.imageUrl ?? primary?.url ?? '');
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category,
    basePrice: dto.basePrice,
    material: dto.materialDefault,
    description: dto.description,
    isActive: dto.isActive,
    imageUrl,
    images: dto.images.map((img) => ({
      id: img.id,
      url: absoluteMediaUrl(img.url),
      alt: img.alt ?? undefined,
      position: img.position ?? undefined,
      isPrimary: img.isPrimary ?? false,
    })),
    variants: dto.variants.map((v) => ({
      material: v.material,
      size: v.size,
      stock: v.stock,
      priceOverride: v.priceOverride ?? dto.basePrice,
      id: v.id,
      reserved: v.reserved,
      sku: v.sku,
      status: v.status,
    })),
  };
}

// ---------------------------------------------------------------------------
// Pedidos (NL-11): el POST devuelve Order con whatsappLink del servidor.
// ---------------------------------------------------------------------------

export interface ApiOrderItem {
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

export interface ApiOrder {
  id: string;
  status: Order['status'];
  totalAmount: number;
  whatsappPhone: string;
  source: string;
  customer: { id?: string; name: string; phone: string } | null;
  items: ApiOrderItem[];
  createdAt: string;
  updatedAt: string;
  whatsappLink?: string;
}

export function fromApiOrder(dto: ApiOrder): Order {
  return {
    id: dto.id,
    status: dto.status,
    totalAmount: dto.totalAmount,
    whatsappPhone: dto.whatsappPhone,
    source: dto.source,
    customer: dto.customer
      ? { id: dto.customer.id, name: dto.customer.name, phone: dto.customer.phone }
      : null,
    items: dto.items.map((i) => ({
      id: i.id,
      productVariantId: i.productVariantId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      name: i.name,
      material: i.material,
      size: i.size,
      imageUrl: i.imageUrl,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    whatsappLink: dto.whatsappLink,
  };
}