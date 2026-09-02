import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import {
  WHATSAPP_PROVIDER,
} from './whatsapp/whatsapp';
import { FakeWhatsAppProvider } from './whatsapp/fake-whatsapp.provider';

/**
 * Pedidos y WhatsApp (NL-10). El envío usa el puerto WHATSAPP_PROVIDER con el
 * driver de desarrollo por defecto (FakeWhatsAppProvider → log); la integración
 * real (Meta/Twilio) se activará en NL-13/14 bajo el mismo token, igual que
 * MEDIA_STORAGE. PassportModule permite instanciar JwtAuthGuard, igual que en
 * InventoryModule/MediaModule.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), AuditModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: WHATSAPP_PROVIDER, useClass: FakeWhatsAppProvider },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}