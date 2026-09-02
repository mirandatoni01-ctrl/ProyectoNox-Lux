import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(12, 'La contraseña debe tener al menos 12 caracteres'),
    fullName: z.string().optional(),
    roleCode: z.enum(['SUPER_ADMIN', 'ADMIN']),
  })
  .strict();
export type RegisterDto = z.infer<typeof registerSchema>;

/** Autoregistro de comprador (Store, rol CUSTOMER). Público. */
export const registerCustomerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    fullName: z.string().min(1, 'El nombre es obligatorio'),
    phone: z
      .string()
      .min(8, 'El teléfono es obligatorio')
      .max(20, 'Teléfono demasiado largo'),
  })
  .strict();
export type RegisterCustomerDto = z.infer<typeof registerCustomerSchema>;

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1, 'La contraseña es obligatoria'),
  })
  .strict();
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, 'refreshToken es obligatorio'),
  })
  .strict();
export type RefreshDto = z.infer<typeof refreshSchema>;

/** Actualización del propio perfil (comprador/admin): nombre y teléfono. */
export const updateProfileSchema = z
  .object({
    fullName: z.string().min(1, 'El nombre no puede estar vacío').optional(),
    phone: z
      .string()
      .min(8, 'Teléfono demasiado corto')
      .max(20, 'Teléfono demasiado largo')
      .optional(),
  })
  .strict()
  .refine((v) => v.fullName !== undefined || v.phone !== undefined, {
    message: 'Debes indicar al menos un campo a actualizar',
  });
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

/** Cambio de contraseña del propio usuario autenticado. */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'La contraseña actual es obligatoria'),
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  })
  .strict();
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;