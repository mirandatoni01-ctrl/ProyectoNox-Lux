import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { db } from '../services/storage/db';
import { REFRESH_STORAGE_KEY } from '../auth/tokenStorage';

beforeEach(async () => {
  await db.products.clear();
});

describe('NOX & LUX — Admin Panel smoke', () => {
  it('sin sesión redirige al login', async () => {
    render(<App />);
    expect(await screen.findByText('Iniciar sesión', undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('Solo personal autorizado')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@noxlux.com')).toBeInTheDocument();
  });

  it('con sesión activa muestra el panel (productos) en lugar del login', async () => {
    sessionStorage.setItem(REFRESH_STORAGE_KEY, 'dev-refresh');
    render(<App />);

    const headings = await screen.findAllByText('Productos', undefined, { timeout: 2000 });
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.queryByText('Iniciar sesión')).not.toBeInTheDocument();
    expect(screen.getAllByText('admin@noxlux.test').length).toBeGreaterThan(0);
  });
});