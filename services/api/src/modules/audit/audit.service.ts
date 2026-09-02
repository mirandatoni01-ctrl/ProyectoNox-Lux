import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginationSchema } from '../../common/validation/pagination';
import { z } from 'zod';

/**
 * Servicio central de auditoría (NL-12).
 * Todas las escrituras a AuditLog pasan por aquí: unifica el patrón,
 * garantiza que el actor siempre se valide contra la BD (sin skip
 * silencioso) y provee un endpoint de lectura para el panel Admin.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    action: string;
    entity: string;
    entityId: string;
    actorUserId?: string;
    metadata?: Prisma.InputJsonValue;
    ip?: string;
    userAgent?: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const writer = input.tx ?? this.prisma;
    let actorId: string | null = null;
    if (input.actorUserId) {
      const actor = await writer.user.findUnique({
        where: { id: input.actorUserId },
        select: { id: true },
      });
      if (actor) {
        actorId = actor.id;
      } else {
        this.logger.warn(
          `Auditoría (${input.action}): actor ${input.actorUserId} no encontrado; se registra sin actor`,
        );
      }
    }
    try {
      await writer.auditLog.create({
        data: {
          ...(actorId ? { actorUserId: actorId } : {}),
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.ip ? { ip: input.ip } : {}),
          ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        },
      });
    } catch (error) {
      this.logger.warn(`No se pudo registrar auditoría (${input.action}): ${String(error)}`);
    }
  }
  async list(query: AuditListQuery) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
        ...(query.entity ? { entity: { contains: query.entity, mode: 'insensitive' } } : {}),
        ...(query.actor ? { actorUserId: query.actor } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: { actorUser: { select: { id: true, email: true, fullName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      actor: r.actorUser,
      metadata: r.metadata,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    }));
  }
}

const auditListSchema = z.object({
  action: z.string().min(1).max(100).optional(),
  entity: z.string().min(1).max(100).optional(),
  actor: z.string().uuid().optional(),
  limit: paginationSchema.shape.limit,
});
export type AuditListQuery = z.infer<typeof auditListSchema>;

// Export schema for the controller (separated to avoid circular dependency with the pipe).
export { auditListSchema };
