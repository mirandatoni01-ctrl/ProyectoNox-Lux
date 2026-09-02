import type { Material, Product, Category, Order, OrderStatus } from '../../../types';

/**
 * Mapero entre el dominio del Admin (@nox-lux/shared: Product) y el contrato
 * REST de la NOX & LUX API. Desde NL-08 el `stock` de cada variante se envía
 * en el alta/edición (alimenta Inventory); el API devuelve además
 * `stock`/`reserved` como lectura. Desde NL-09 el producto admite varias
 * imágenes (`images[]`, galería) con la primaria en `imageUrl`.
 */

export interface ApiVariantInput {
  material: Material;
  size: string;
  priceOverride: number;
  stock: number;
}

export interface ApiProductImage {
  id: string;
  url: string;
  alt?: string;
  position?: number;
  isPrimary?: boolean;
}

export interface ApiCreateProductDto {
  name: string;
  category: Category;
  basePrice: number;
  materialDefault: Material;
  description: string;
  isActive: boolean;
  imageUrl?: string;
  images?: ApiProductImage[];
  variants: ApiVariantInput[];
}

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

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  category: Category;
  description: string;
  isActive: boolean;
  basePrice: number;
  materialDefault: Material;
  imageUrl: string | null;
  images: ApiProductImage[];
  variants: ApiProductVariant[];
}

/** Product del Admin -> DTO de creación del API. */
export function toApiCreateProduct(product: Product): ApiCreateProductDto {
  return {
    name: product.name,
    category: product.category as Category,
    basePrice: product.basePrice,
    materialDefault: product.material,
    description: product.description,
    isActive: product.isActive,
    imageUrl: product.imageUrl || undefined,
    images: product.images?.map((img, index) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: index,
      isPrimary: img.isPrimary,
    })),
    variants: product.variants.map((v) => ({
      material: v.material,
      size: v.size,
      priceOverride: v.priceOverride,
      stock: v.stock,
    })),
  };
}

/** Product del Admin -> DTO de actualización del API (reemplazo de variantes). */
export function toApiUpdateProduct(product: Product): ApiCreateProductDto {
  return toApiCreateProduct(product);
}

/** Producto del API -> Product del Admin. */
export function fromApiProduct(dto: ApiProduct): Product {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category,
    basePrice: dto.basePrice,
    material: dto.materialDefault,
    description: dto.description,
    isActive: dto.isActive,
    imageUrl: dto.imageUrl ?? (dto.images[0]?.url ?? ''),
    images: dto.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: img.position,
      isPrimary: img.isPrimary ?? false,
    })),
    variants: dto.variants.map((v) => ({
      material: v.material,
      size: v.size,
      stock: v.stock,
      priceOverride: v.priceOverride ?? dto.basePrice,
    })),
  };
}

// ---------------------------------------------------------------------------
// Pedidos (NL-10)
// ---------------------------------------------------------------------------

export interface ApiOrderLineItem {
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
  status: OrderStatus;
  totalAmount: number;
  whatsappPhone: string;
  source: string;
  customer: { id?: string; name: string; phone: string } | null;
  items: ApiOrderLineItem[];
  createdAt: string;
  updatedAt: string;
}

/** Pedido del API -> Order del Admin (los decimales ya vienen como number). */
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
  };
}