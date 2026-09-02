import { z } from 'zod';

/**
 * NOX & LUX — DTO de inventario (NL-08).
 * Gestión de stockOnHand por variante; `reserved` (reservas) llega en NL-10.
 */

export const setStockSchema = z.object({
  stockOnHand: z.number().int().min(0),
  reason: z.string().max(200).optional(),
});
export type SetStockDto = z.infer<typeof setStockSchema>;

export const adjustStockSchema = z.object({
  delta: z.number().int().refine((d) => d !== 0, {
    message: 'El delta no puede ser 0',
  }),
  reason: z.string().max(200).optional(),
});
export type AdjustStockDto = z.infer<typeof adjustStockSchema>;