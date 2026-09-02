import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService, auditListSchema, type AuditListQuery } from './audit.service';

/**
 * Auditoría — endpoint de lectura (NL-12).
 * `GET /api/audit` listado con filtros action/entity/actor + paginación.
 * Requiere JWT + permiso `auditoria:ver` (super-admin o admin con permiso en
 * RBAC).
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('auditoria:ver')
  async list(@Query(new ZodValidationPipe(auditListSchema)) query: AuditListQuery) {
    return this.auditService.list(query);
  }
}
