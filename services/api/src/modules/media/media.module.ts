import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import {
  MEDIA_STORAGE,
} from './storage/media-storage';
import { LocalMediaStorageProvider } from './storage/local-media-storage.provider';

/**
 * Media (imágenes, NL-09).
 * Driver local por defecto (LocalMediaStorageProvider); el driver S3-compatible
 * se activará en NL-13/14 bajo el mismo token. ProductsModule importa este
 * módulo para gestionar blobs al reemplazar/eliminar imágenes.
 * PassportModule permite instanciar JwtAuthGuard (AuthModuleOptions) aquí,
 * igual que en InventoryModule/ProductsModule.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), AuditModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    { provide: MEDIA_STORAGE, useClass: LocalMediaStorageProvider },
  ],
  exports: [MediaService],
})
export class MediaModule {}