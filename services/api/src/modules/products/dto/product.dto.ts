import { z } from 'zod';
import { limitField } from '../../../common/validation/pagination';

/**
 * NOX & LUX — DTO de productos/variantes (NL-07, stock en NL-08).
 * Validación con Zod (mismo patrón que auth/dto). `stock` por variante
 * alimenta Inventory en el alta/edición de producto (NL-08).
 */

export const materialEnum = z.enum(['STAINLESS_STEEL', 'COVERGOLD', 'RHODIUM']);
export const categoryEnum = z.enum(['anillos', 'cadenas', 'aretes', 'pulseras']);

export const productImageInputSchema = z.object({
  url: z.string().min(1).max(500),
  alt: z.string().max(200).optional(),
  position: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});

export const variantInputSchema = z.object({
  material: materialEnum,
  size: z.string().min(1).max(20),
  priceOverride: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(120),
  category: categoryEnum,
  description: z.string().max(2000).default(''),
  basePrice: z.number().positive(),
  materialDefault: materialEnum,
  isActive: z.boolean().default(true),
  imageUrl: z.string().min(1).max(500).optional(),
  images: z.array(productImageInputSchema).optional(),
  variants: z.array(variantInputSchema).default([]),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: categoryEnum.optional(),
  description: z.string().max(2000).optional(),
  basePrice: z.number().positive().optional(),
  materialDefault: materialEnum.optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().min(1).max(500).optional(),
  images: z.array(productImageInputSchema).optional(),
  variants: z.array(variantInputSchema).optional(),
});
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
  category: categoryEnum.optional(),
  search: z.string().min(1).max(100).optional(),
  limit: limitField,
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;