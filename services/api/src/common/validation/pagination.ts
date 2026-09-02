import { z } from 'zod';

/**
 * Paginación por límite (NL-12). Todos los listados admin acotan el número de
 * filas devueltas (`limit` entre 1 y MAX_LIST_LIMIT, por defecto
 * DEFAULT_LIST_LIMIT) para evitar consultas sin límite bajo abuso.
 */
export const MAX_LIST_LIMIT = 100;
export const DEFAULT_LIST_LIMIT = 50;

export const limitField = z.coerce
  .number({ message: 'limit debe ser un número' })
  .int()
  .min(1, 'limit debe ser al menos 1')
  .max(MAX_LIST_LIMIT, `limit no puede superar ${MAX_LIST_LIMIT}`)
  .default(DEFAULT_LIST_LIMIT);

export const paginationSchema = z.object({
  limit: limitField,
});
export type PaginationQuery = z.infer<typeof paginationSchema>;