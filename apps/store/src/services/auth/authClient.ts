/**
 * NOX & LUX — Cliente HTTP autenticado del Store (NL-13).
 * A diferencia del cliente anónimo (`../api/client`), este cliente adjunta un
 * JWT Bearer a cada petición. Las credenciales se persisten en sessionStorage
 * (alcance de pestaña), evitando tokens en el almacenamiento persistente.
 * Soporta registro/login de comprador, perfil, cambio de contraseña, historial
 * de pedidos y tickets de "Contact Us".
 */
import { ApiError } from '../api/client';

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

const TOKEN_KEY = 'noxlux.accessToken';

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage no disponible: sesión efímera en memoria */
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractMessage(payload: unknown): string {
  if (!isRecord(payload)) return '';
  const raw = payload.message;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        if (isRecord(item) && typeof item.message === 'string') {
          const path =
            typeof item.path === 'string' && item.path.length > 0 ? `${item.path}: ` : '';
          return `${path}${item.message}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('. ');
  }
  return '';
}

type AuthResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

async function authFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<AuthResponse<T>> {
  let res: Response;
  try {
    const token = getAccessToken();
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    return { ok: false, error: new ApiError(0, 'No se pudo contactar la NOX & LUX API') };
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const message = extractMessage(data) || res.statusText;
    return { ok: false, error: new ApiError(res.status, message) };
  }
  return { ok: true, data: data as T };
}

/** Petición autenticada que, ante 401, limpia la sesión (token expirado). */
export async function authed<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  onUnauthorized?: () => void,
): Promise<AuthResponse<T>> {
  const res = await authFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && res.error.status === 401 && getAccessToken()) {
    setAccessToken(null);
    onUnauthorized?.();
  }
  return res;
}

export interface SessionPair {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterCustomerInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export type CustomerMe = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  provider: string | null;
  roles: string[];
  permissions: string[];
};

export const authApi = {
  login(email: string, password: string) {
    return authFetch<SessionPair>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  registerCustomer(input: RegisterCustomerInput) {
    return authFetch<SessionPair>('/api/auth/register/customer', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  me(onUnauthorized?: () => void) {
    return authed<CustomerMe>('GET', '/api/auth/me', undefined, onUnauthorized);
  },
  updateProfile(input: { fullName?: string; phone?: string }, onUnauthorized?: () => void) {
    return authed<{ id: string; fullName: string | null; phone: string | null }>(
      'PATCH',
      '/api/auth/me',
      input,
      onUnauthorized,
    );
  },
  changePassword(input: { currentPassword: string; newPassword: string }, onUnauthorized?: () => void) {
    return authed<void>('PATCH', '/api/auth/me/password', input, onUnauthorized);
  },
  myOrders(onUnauthorized?: () => void) {
    return authed<unknown[]>('GET', '/api/orders/mine', undefined, onUnauthorized);
  },
  createTicket(
    input: { name: string; email: string; phone: string; subject: string; message: string },
    onUnauthorized?: () => void,
  ) {
    return authed<{ id: string; status: string; createdAt: string }>(
      'POST',
      '/api/tickets',
      input,
      onUnauthorized,
    );
  },
  myTickets(onUnauthorized?: () => void) {
    return authed<unknown[]>('GET', '/api/tickets/mine', undefined, onUnauthorized);
  },
};