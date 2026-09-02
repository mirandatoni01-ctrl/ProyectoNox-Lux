/**
 * NOX & LUX — Puerto de envío de WhatsApp (NL-10).
 * El backend es el dueño del mensaje de pedido y del número de negocio
 * (WHATSAPP_NUMBER); la UI solo abre el enlace wa.me. Al igual que
 * MEDIA_STORAGE (NL-09), la UI/negocio dependen de esta interfaz y el driver
 * concreto se resuelve por inyección: NL-10 usa FakeWhatsAppProvider (log); la
 * integración real (Meta/Twilio) llegará en NL-13/14 bajo el mismo token.
 */

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');

/** Resultado de un intento de envío. */
export interface WhatsAppSendResult {
  ok: boolean;
}

/**
 * Contrato de un proveedor de WhatsApp.
 * `to` es el teléfono del cliente (formato E.164) y `message` el texto ya
 * construido por `buildOrderWhatsAppMessage`.
 */
export interface WhatsAppProvider {
  send(to: string, message: string): Promise<WhatsAppSendResult>;
}