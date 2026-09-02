import { getAccessToken } from '../../auth/tokenStorage';

/**
 * Cliente HTTP de la NOX & LUX API para el Admin (NL-07).
 * Comparten este helper los repositorios de auth y de productos.
 */

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

/**
 * Convierte una url de media del API (relativa, /api/media/file/...) en URL
 * absoluta consumible por <img>. Las urls externas (https) se respetan.
 */
export function absoluteMediaUrl(url: string): string {
  if (!url) return '';
  if (/^https?:/i.test(url)) return url;
  if (url.startsWith('/api/')) return `${API_URL}${url}`;
  return url;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

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

export async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const isFormData =
      typeof FormData !== 'undefined' &&
      typeof init.body === 'object' &&
      init.body !== null &&
      'append' in init.body;
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;
    if (!res.ok) {
      const message = extractMessage(data) || res.statusText;
      return { ok: false, error: new ApiError(res.status, message) };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: new ApiError(0, 'No se pudo contactar la NOX & LUX API') };
  }
}

/**
 * Petición autenticada: adjunta el ACCESS token (memoria) como Bearer.
 * Si el token no existe el servidor responde 401 y el llamador lo propaga;
 * la renovación/redirección expira con NL-12.
 */
export async function authedRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  return request<T>(path, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}