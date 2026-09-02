import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

/**
 * Auditoría (registro de acciones, SECURITY_MODEL.md).
 * AuditService se exporta para que otros módulos (auth, inventory, orders,
 * media, products) lo inyecten y centralicen TODAS las escrituras de AuditLog.
 * PassportModule permite instanciar JwtAuthGuard (AuthModuleOptions) aquí,
 * igual que en InventoryModule/MediaModule.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
