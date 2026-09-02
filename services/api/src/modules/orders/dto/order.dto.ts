import { z } from 'zod';
import { limitField } from '../../../common/validation/pagination';

/**
 * NOX & LUX — DTO de pedidos (NL-10).
 * Validación con Zod (mismo patrón que productos/auth). El precio NUNCA viaja
 * desde el cliente: se calcula server-side (priceOverride ?? basePrice) para
 * evitar manipulación (S-06 → NL-10, SECURITY_MODEL).
 *
 * Reglas de stock (DATA_MODEL): al crear (pending) se RESERVA stock con
 * no-sobreventa contra available = stockOnHand − reserved.
 */

const productVariantIdSchema = z.string().uuid();
const phoneSchema = z
  .string()
  .min(8)
  .max(20)
  .regex(/^[0-9+]+$/);

export const orderItemInputSchema = z.object({
  productVariantId: productVariantIdSchema,
  quantity: z.number().int().min(1).max(999),
});

export const createOrderSchema = z.object({
  name: z.string().min(1).max(120),
  whatsappPhone: phoneSchema,
  items: z.array(orderItemInputSchema).min(1),
}).strict();
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
}).strict();
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  limit: limitField,
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;