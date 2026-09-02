import type { Material } from '@prisma/client';

/**
 * NOX & LUX — Construcción del mensaje/enlace de WhatsApp (NL-10).
 * El mensaje de pedido se construye en el servidor (fuente de verdad, misma
 * estructura que el resumen del Store) y el número de negocio proviene de
 * `WHATSAPP_NUMBER` — nunca del cliente (SECURITY_MODEL NL-10).
 */

/** Número de negocio por defecto en dev (mismo valor que env .env.example). */
export const DEFAULT_WHATSAPP_NUMBER = '573000000000';

const MATERIAL_LABELS: Record<Material, string> = {
  STAINLESS_STEEL: 'ACERO INOXIDABLE',
  COVERGOLD: 'COVERGOLD',
  RHODIUM: 'RODIO',
};

export interface WhatsAppOrderItem {
  name: string;
  material: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface WhatsAppOrderSummary {
  items: WhatsAppOrderItem[];
  totalAmount: number;
}

/** Número de negocio configurado (env WHATSAPP_NUMBER) o el default de dev. */
export function whatsAppBusinessNumber(): string {
  return process.env.WHATSAPP_NUMBER ?? DEFAULT_WHATSAPP_NUMBER;
}

/** Mensaje estructurado del pedido (mismo formato que el carrito del Store). */
export function buildOrderWhatsAppMessage(summary: WhatsAppOrderSummary): string {
  let msg = `*NUEVO PEDIDO - NOX & LUX*\n`;
  msg += `-----------------------------------\n\n`;
  summary.items.forEach((item, i) => {
    msg += `${i + 1}. *${item.name}*\n`;
    msg += `   • Material: ${MATERIAL_LABELS[item.material as Material] ?? item.material}\n`;
    msg += `   • Variante/Medida: ${item.size}\n`;
    msg += `   • Cantidad: ${item.quantity}\n`;
    msg += `   • Subtotal: $${item.lineTotal.toFixed(2)}\n\n`;
  });
  msg += `-----------------------------------\n`;
  msg += `*TOTAL A PAGAR:* $${summary.totalAmount.toFixed(2)}\n\n`;
  msg += `Solicito confirmación de inventario e instrucciones para completar el pago y entrega.`;
  return msg;
}

/** Enlace wa.me del negocio con el mensaje pre-codificado. */
export function buildWhatsAppLink(message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${whatsAppBusinessNumber()}?text=${encoded}`;
}