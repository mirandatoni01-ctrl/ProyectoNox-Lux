import { z } from 'zod';

/** Creación de un ticket de contacto (formulario "Contact Us"). Público. */
export const createTicketSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').max(120),
    email: z.string().email('Email inválido'),
    phone: z
      .string()
      .min(8, 'El teléfono es obligatorio')
      .max(20, 'Teléfono demasiado largo'),
    subject: z.string().min(1, 'El asunto es obligatorio').max(160),
    message: z.string().min(5, 'El mensaje es demasiado corto').max(4000),
  })
  .strict();
export type CreateTicketDto = z.infer<typeof createTicketSchema>;

/** Filtros de listado (Admin). */
export const listTicketsQuerySchema = z
  .object({
    status: z.enum(['new', 'in_progress', 'resolved', 'closed']).optional(),
    q: z.string().max(120).optional(),
  })
  .strict();
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

/** Actualización de estado de un ticket (Admin). */
export const updateTicketStatusSchema = z
  .object({
    status: z.enum(['new', 'in_progress', 'resolved', 'closed']),
    adminNote: z.string().max(1000).optional(),
  })
  .strict();
export type UpdateTicketStatusDto = z.infer<typeof updateTicketStatusSchema>;