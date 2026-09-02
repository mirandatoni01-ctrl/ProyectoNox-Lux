import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../app/App';
import { AuthProvider } from '../services/auth/AuthContext';
import { db } from '../services/storage/db';

const jsonResponse = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: async () => JSON.stringify(payload),
  }) as unknown as Response;

describe('NOX & LUX — smoke test del MVP (catálogo online, NL-11)', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.cartItems.clear();
    globalThis.fetch = vi.fn(async () => jsonResponse(200, [])) as unknown as typeof fetch;
  });

  it('renderiza el encabezado y el estado vacío del catálogo', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(screen.getByText('NOX & LUX')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('BUSCAR JOYAS, CADENAS, ANILLOS...')).toBeInTheDocument();

    expect(await screen.findByText('No se encontraron productos')).toBeInTheDocument();
    expect(screen.queryByText('NOX & LUX ONLINE')).toBeInTheDocument();
  });
});