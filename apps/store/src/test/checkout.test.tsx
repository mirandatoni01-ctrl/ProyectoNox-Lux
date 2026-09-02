import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../app/App';
import { AuthProvider } from '../services/auth/AuthContext';
import { db } from '../services/storage/db';
import type { ApiOrder, ApiProduct } from '../services/repositories/api/mappers';

const jsonResponse = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: async () => JSON.stringify(payload),
  }) as unknown as Response;

const catalogProduct: ApiProduct = {
  id: 'prod-1',
  name: 'ANILLO TEST',
  slug: 'anillo-test',
  category: 'anillos',
  description: 'Producto real.',
  isActive: true,
  basePrice: 100,
  materialDefault: 'COVERGOLD',
  imageUrl: 'http://localhost:3000/api/media/file/img.jpg',
  images: [],
  variants: [
    {
      id: 'var-1',
      sku: 'ANILLO-HELIOS-01',
      material: 'COVERGOLD',
      size: 'Talla 6',
      priceOverride: null,
      status: 'ACTIVE',
      stock: 12,
      reserved: 3,
    },
  ],
};

const createdOrder: ApiOrder = {
  id: 'order-1',
  status: 'pending',
  totalAmount: 100,
  whatsappPhone: '573001234567',
  source: 'STORE',
  customer: { name: 'Cliente', phone: '573001234567' },
  items: [
    {
      id: 'line-1',
      productVariantId: 'var-1',
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      name: 'ANILLO TEST',
      material: 'COVERGOLD',
      size: 'Talla 6',
      imageUrl: null,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  whatsappLink: 'https://wa.me/573001111111?text=Hola',
};

function stubApi(ordersStatus: 201 | 409 = 201) {
  const ordersPayload = ordersStatus === 201 ? createdOrder : { message: 'Stock insuficiente' };
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/orders')) {
      expect(init?.method).toBe('POST');
    }
    if (url.includes('/api/products/catalog')) return jsonResponse(200, [catalogProduct]);
    if (url.includes('/api/orders')) return jsonResponse(ordersStatus, ordersPayload);
    return jsonResponse(404, { message: 'Not found' });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

// Flujo completo del comprador: catálogo real → carrito → checkout (POST
// /api/orders) → éxito → vaciar carrito (NL-11).
describe('NOX & LUX — checkout de pedido (NL-11)', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.cartItems.clear();
  });

  it('crea el pedido en la API y al abrir WhatsApp vacía el carrito', async () => {
    const fetchMock = stubApi();
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    // 1. Catálogo online muestra el producto (disponible = 12 - 3 = 9).
    await screen.findByText('ANILLO TEST');
    expect(screen.getByText('NOX & LUX ONLINE')).toBeInTheDocument();

    // 2. Añadir al carrito.
    fireEvent.click(screen.getByText('ANILLO TEST'));
    fireEvent.click(screen.getByText('AÑADIR AL CARRITO'));

    // 3. Ir al carrito y abrir checkout.
    fireEvent.click(screen.getByRole('button', { name: 'Carrito' }));
    expect(screen.getByText('COMPRAR VÍA WHATSAPP')).toBeInTheDocument();
    fireEvent.click(screen.getByText('COMPRAR VÍA WHATSAPP'));

    // 4. Datos del cliente: el POST va anónimo con la variante real.
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Cliente' } });
    fireEvent.change(screen.getByPlaceholderText('Ej. 573001234567'), {
      target: { value: '573001234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR PEDIDO' }));

    // 5. Éxito: total del SERVIDOR + enlace WhatsApp del negocio.
    expect(
      await screen.findByText('PEDIDO REGISTRADO · INVENTARIO RESERVADO'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0);
    const whatsapp = screen.getByRole('link', { name: /ABRIR WHATSAPP/i });
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/573001111111?text=Hola');

    const orderCall = fetchMock.mock.calls.find(([input]) => String(input).includes('/api/orders'));
    expect(orderCall).toBeDefined();
    const [, init] = orderCall!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({
      name: 'Cliente',
      whatsappPhone: '573001234567',
      items: [{ productVariantId: 'var-1', quantity: 1 }],
    });

    // 6. Al abrir WhatsApp → pedido registrado y carrito vacío.
    fireEvent.click(whatsapp);
    await waitFor(() => {
      expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    });
  });

  it('muestra banner de stock insuficiente (409) y refresca el catálogo', async () => {
    stubApi(409);
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    await screen.findByText('ANILLO TEST');

    fireEvent.click(screen.getByText('ANILLO TEST'));
    fireEvent.click(screen.getByText('AÑADIR AL CARRITO'));

    fireEvent.click(screen.getByRole('button', { name: 'Carrito' }));
    fireEvent.click(screen.getByText('COMPRAR VÍA WHATSAPP'));
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Cliente' } });
    fireEvent.change(screen.getByPlaceholderText('Ej. 573001234567'), {
      target: { value: '573001234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR PEDIDO' }));

    expect(
      await screen.findByText(/Stock insuficiente: el catálogo se actualizó/),
    ).toBeInTheDocument();
  });
});