import { Injectable, Logger } from '@nestjs/common';
import { type WhatsAppProvider, type WhatsAppSendResult } from './whatsapp';

/**
 * Proveedor de WhatsApp de desarrollo (NL-10): registra el envío en el log en
 * lugar de contactar la API de Meta. NO se registra el contenido completo del
 * mensaje (contiene datos del cliente/pedido): el teléfono se enmascara y solo
 * se informa longitud y resumen (NL-12, protección de PII en logs).
 * Reemplazable por el driver real en NL-13/14 — SECURITY_MODEL: el número de
 * negocio nunca viaja al cliente.
 */
@Injectable()
export class FakeWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger('WhatsAppProvider');

  async send(to: string, message: string): Promise<WhatsAppSendResult> {
    this.logger.log(
      `[FAKE] envío a ${this.maskPhone(to)} (${message.length} caracteres, contenido omitido por privacidad)`,
    );
    return { ok: true };
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 7) return `${phone.slice(0, 2)}***`;
    return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
  }
}