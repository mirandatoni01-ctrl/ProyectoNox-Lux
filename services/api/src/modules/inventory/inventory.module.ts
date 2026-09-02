import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

/**
 * Inventario y stock (NL-08): lectura de stock por variante y ajustes
 * (set/adjust) con ledger StockMovement + auditoría.
 * PassportModule permite instanciar JwtAuthGuard (AuthModuleOptions) aquí,
 * igual que en ProductsModule.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), AuditModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}