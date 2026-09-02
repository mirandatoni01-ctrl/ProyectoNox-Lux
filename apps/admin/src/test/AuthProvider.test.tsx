import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { useAuth } from '../auth/useAuth';
import { getAccessToken, REFRESH_STORAGE_KEY } from '../auth/tokenStorage';

function Probe() {
  const { user, isAuthenticated, isBooting, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="boot">{String(isBooting)}</p>
      <p data-testid="auth">{String(isAuthenticated)}</p>
      {user && <p data-testid="email">{user.email}</p>}
      <button onClick={() => void login('admin@noxlux.test', 'cualquiera')}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('AuthProvider (modo dev)', () => {
  it('arranca sin sesión cuando no hay refresh token', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('boot').textContent).toBe('false'), { timeout: 2000 });
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(screen.queryByTestId('email')).toBeNull();
  });

  it('restaura la sesión desde el refresh token al arrancar', async () => {
    sessionStorage.setItem(REFRESH_STORAGE_KEY, 'dev-refresh');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'), { timeout: 2000 });
    expect(screen.getByTestId('email').textContent).toBe('admin@noxlux.test');
    expect(getAccessToken()).toContain('dev.');
  });

  it('login establece la sesión y logout la cierra (access token en memoria)', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('admin@noxlux.test'), {
      timeout: 2000,
    });

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('false'), { timeout: 2000 });
    expect(getAccessToken()).toBeNull();
    expect(sessionStorage.getItem(REFRESH_STORAGE_KEY)).toBeNull();
  });
});