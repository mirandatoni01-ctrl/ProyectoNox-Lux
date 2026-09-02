import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  type CreateTicketDto,
  type ListTicketsQuery,
  type UpdateTicketStatusDto,
} from './dto/tickets.dto';

/**
 * Tickets de contacto (NL-13): el formulario "Contact Us" del Store crea un
 * ticket gestionable en el Admin. El alta es pública (con email verificado al
 * crear); la gestión (listar, cambiar estado) es admin (tickets:ver/gestionar).
 */
@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** POST /api/tickets — creación pública (Contact Us). Devuelve el ticket y un id de cliente extraído. */
  async create(dto: CreateTicketDto, userId?: string | null) {
    const ticket = await this.prisma.contactTicket.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
        status: 'new',
        ...(userId ? { userId } : {}),
      },
    });
    await this.auditService.record({
      action: 'tickets.create',
      entity: 'ticket',
      entityId: ticket.id,
      metadata: { email: dto.email, subject: dto.subject },
      actorUserId: userId ?? undefined,
    });
    return {
      id: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
    };
  }

  /** GET /api/tickets — listado admin (tickets:ver). */
  async list(query: ListTicketsQuery) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { subject: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { name: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.contactTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows;
  }

  /** GET /api/tickets/mine — tickets del propio usuario. */
  async listByUser(userId: string) {
    return this.prisma.contactTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** PATCH /api/tickets/:id/status — transición de estado (admin). */
  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.contactTicket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ticket no encontrado');
    const updated = await this.prisma.contactTicket.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote } : {}),
      },
    });
    await this.auditService.record({
      action: 'tickets.status',
      entity: 'ticket',
      entityId: id,
      metadata: { from: existing.status, to: dto.status },
      actorUserId,
    });
    return updated;
  }
}