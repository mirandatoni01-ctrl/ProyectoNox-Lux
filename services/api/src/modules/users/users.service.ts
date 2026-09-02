import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface UserListItem {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  roles: string[];
}

/**
 * Gestión de usuarios (Admin, NL-13): listar, ver detalle y asignar roles /
 * activar o desactivar. Solo admin (usuarios:ver / usuarios:gestionar).
 * El alta de usuarios la cubre AuthService.register (rol SUPER_ADMIN).
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** GET /api/users — lista usuarios con sus roles. */
  async list(query: { q?: string; roleCode?: string; isActive?: boolean }): Promise<UserListItem[]> {
    const where: PrismaUserWhere = {};
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.roleCode) {
      where.roles = { some: { role: { code: query.roleCode as RoleCode } } };
    }
    const rows = await this.prisma.user.findMany({
      where,
      include: { roles: { include: { role: { select: { code: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt,
      roles: u.roles.map((r) => r.role.code),
    }));
  }

  /** GET /api/users/:id — detalle (incluye permisos resueltos). */
  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const roles = user.roles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)),
      ),
    ];
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      provider: user.provider,
      createdAt: user.createdAt,
      roles,
      permissions,
    };
  }

  /** PATCH /api/users/:id — asignar roles y activar/desactivar. */
  async update(
    id: string,
    input: { roleCodes?: RoleCode[]; isActive?: boolean },
    actorUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (input.roleCodes !== undefined) {
      if (input.roleCodes.length === 0) {
        throw new BadRequestException('Debe asignarse al menos un rol');
      }
      const uniqueCodes = [...new Set(input.roleCodes)];
      const roles = await this.prisma.role.findMany({
        where: { code: { in: uniqueCodes } },
        select: { id: true, code: true },
      });
      if (roles.length !== uniqueCodes.length) {
        throw new BadRequestException('Alguno de los roles no existe');
      }
      await this.prisma.$transaction([
        this.prisma.userRole.deleteMany({ where: { userId: id } }),
        this.prisma.userRole.createMany({
          data: roles.map((r) => ({ userId: id, roleId: r.id })),
        }),
      ]);
    }
    if (input.isActive !== undefined) {
      await this.prisma.user.update({
        where: { id },
        data: { isActive: input.isActive },
      });
    }
    await this.auditService.record({
      action: 'users.update',
      entity: 'user',
      entityId: id,
      metadata: { roleCodes: input.roleCodes, isActive: input.isActive },
      actorUserId,
    });
    return this.getById(id);
  }
}

type PrismaUserWhere = import('@prisma/client').Prisma.UserWhereInput;