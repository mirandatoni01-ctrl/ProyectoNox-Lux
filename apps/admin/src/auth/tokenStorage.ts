/**
 * NOX & LUX — Almacenamiento de tokens del Admin.
 *
 * ADR-NL-006 (decisión): el ACCESS token vive SOLO en memoria (nunca en
 * localStorage/sessionStorage); el REFRESH token vive en `sessionStorage`
 * (se purga al cerrar la pestaña). Ver SECURITY_MODEL.md sección 2.
 */

export const REFRESH_STORAGE_KEY = 'nox_lux_admin_refresh_token';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_STORAGE_KEY);
}

export function setTokens(pair: { accessToken: string; refreshToken: string } | null): void {
  accessToken = pair?.accessToken ?? null;
  if (pair?.refreshToken) {
    sessionStorage.setItem(REFRESH_STORAGE_KEY, pair.refreshToken);
  } else {
    sessionStorage.removeItem(REFRESH_STORAGE_KEY);
  }
}

export function clearTokens(): void {
  accessToken = null;
  sessionStorage.removeItem(REFRESH_STORAGE_KEY);
}