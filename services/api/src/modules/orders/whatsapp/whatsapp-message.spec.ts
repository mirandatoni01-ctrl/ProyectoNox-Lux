import {
  buildOrderWhatsAppMessage,
  buildWhatsAppLink,
  DEFAULT_WHATSAPP_NUMBER,
  whatsAppBusinessNumber,
} from './whatsapp-message';

describe('WhatsApp message/link (unit)', () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_NUMBER;
  });

  const summary = {
    items: [
      {
        name: 'ANILLO TEST',
        material: 'STAINLESS_STEEL',
        size: 'T18',
        quantity: 2,
        unitPrice: 45,
        lineTotal: 90,
      },
    ],
    totalAmount: 90,
  };

  it('construye el resumen del pedido con item, material y total', () => {
    const msg = buildOrderWhatsAppMessage(summary);
    expect(msg).toContain('*NUEVO PEDIDO - NOX & LUX*');
    expect(msg).toContain('1. *ANILLO TEST*');
    expect(msg).toContain('Material: ACERO INOXIDABLE');
    expect(msg).toContain('Cantidad: 2');
    expect(msg).toContain('Subtotal: $90.00');
    expect(msg).toContain('*TOTAL A PAGAR:* $90.00');
  });

  it('usa el número de negocio por defecto y respeta WHATSAPP_NUMBER', () => {
    expect(whatsAppBusinessNumber()).toBe(DEFAULT_WHATSAPP_NUMBER);
    process.env.WHATSAPP_NUMBER = '573111111111';
    expect(whatsAppBusinessNumber()).toBe('573111111111');
  });

  it('genera el enlace wa.me con el mensaje pre-codificado', () => {
    const link = buildWhatsAppLink('Hola dominio & test');
    expect(link.startsWith('https://wa.me/')).toBe(true);
    expect(link).toContain('text=');
    expect(decodeURIComponent(link.split('text=')[1])).toBe('Hola dominio & test');
  });
});