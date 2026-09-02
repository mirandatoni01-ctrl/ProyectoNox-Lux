import { FakeWhatsAppProvider } from './fake-whatsapp.provider';

describe('FakeWhatsAppProvider (unit)', () => {
  it('send devuelve ok=true (registra el mensaje en el log)', async () => {
    const provider = new FakeWhatsAppProvider();
    const result = await provider.send('573001234567', '*NUEVO PEDIDO - NOX & LUX*');
    expect(result).toEqual({ ok: true });
  });
});