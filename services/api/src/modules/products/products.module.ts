import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { MediaModule } from '../media/media.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

/**
 * Productos y variantes. CRUD completo (NL-07), imágenes múltiples (NL-09).
 * PassportModule permite instanciar JwtAuthGuard aquí (necesita
 * AuthModuleOptions), igual que lo hace AuthModule para sus controladores.
 * MediaModule se importa para gestionar los blobs al reemplazar/eliminar
 * imágenes de producto (MEDIA / PRODUCT_IMAGES, SYSTEM_BOUNDARIES).
 * AuditModule centraliza la auditoría del CRUD (NL-12).
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), MediaModule, AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
