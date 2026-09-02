import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CustomersModule } from './modules/customers/customers.module';
import { MediaModule } from './modules/media/media.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { TicketsModule } from './modules/tickets/tickets.module';

/**
 * NOX & LUX API — módulo raíz (Modular Monolith, ADR-NL-004).
 * Cada módulo representa un dominio del backend (ver SYSTEM_BOUNDARIES.md):
 * auth, authorization, products, inventory, orders, customers, media, audit,
 * users, tickets.
 */
@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    AuthorizationModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    CustomersModule,
    MediaModule,
    AuditModule,
    UsersModule,
    TicketsModule,
  ],
})
export class AppModule {}
