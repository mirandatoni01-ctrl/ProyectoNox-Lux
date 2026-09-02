import { z } from 'zod';

/** Actualización de un usuario (Admin). Roles y estado (activar/desactivar). */
export const updateUserSchema = z
  .object({
    roleCodes: z.array(z.enum(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER'])).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.roleCodes !== undefined || v.isActive !== undefined, {
    message: 'Debes indicar al menos un campo (roleCodes o isActive)',
  });
export type UpdateUserDto = z.infer<typeof updateUserSchema>;