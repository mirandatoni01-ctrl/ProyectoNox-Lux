/**
 * NOX & LUX — Contrato del repositorio de autenticación (port).
 *
 * La UI depende de esta interfaz (ADR-NL-002). Dos implementaciones:
 *  - `ApiAuthRepository`: endpoints reales de la NOX & LUX API (NL-05).
 *  - `DevAuthRepository`: demostración local, SOLO desarrollo.
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthRepository {
  /** Autentica con email + contraseña y devuelve el par de tokens. */
  login(email: string, password: string): Promise<TokenPair>;

  /** Resuelve el perfil del usuario autenticado a partir del access token. */
  me(accessToken: string): Promise<AuthUser>;

  /** Rota el refresh token (rotation/revocation, ver SECURITY_MODEL.md). */
  refresh(refreshToken: string): Promise<TokenPair>;

  /** Revoca el refresh token en el servidor (cierre de sesión). */
  logout(refreshToken: string): Promise<void>;
}

/** Contrato de payload del token de acceso (fixed del backend, NL-05). */
export function decodeAccessTokenPayload(token: string): { sub: string; email: string } | undefined {
  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(json) as { sub?: string; email?: string };
    if (!parsed.sub) return undefined;
    return { sub: parsed.sub, email: parsed.email ?? '' };
  } catch {
    return undefined;
  }
}