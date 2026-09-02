# ADR-NL-018 — Autenticación dual: Google OAuth + contraseña

**Estado:** IMPLEMENTADO (NL-05)
**Fecha:** 2026-08-28
**Contexto:** Extiende ADR-NL-001 / SECURITY_MODEL.md. El modelo aprobado
inicial (contraseña Argon2id + JWT) se amplía por decisión del PO para permitir
**login con cuenta de Google** (proveedor de identidad), manteniendo la
contraseña como vía alternativa.

## Contexto
El backend necesita autenticación real (SECURITY_AUDIT S-01/S-02) antes de
exponer operaciones admin. El equipo de operación prefiere entrar con cuentas de
Google Workspace, pero se conserva el flujo por contraseña aprobado.

## Problema
Elegir el método de autenticación de los usuarios administrativos.

## Opciones consideradas
- **A)** Solo contraseña Argon2id + JWT (modelo original aprobado).
- **B)** Solo Google OAuth (identidad de Google). Rápido de operar, pero elimina
  la vía por contraseña y depende de un proveedor externo.
- **C)** **Dual: Google OAuth + contraseña** (unificado en JWT). *(elegida)*

## Decisión propuesta
Implementar **ambos flujos** en el backend:

- **Contraseña**: `POST /api/auth/login` → Argon2id → emite JWT.
- **Google OAuth 2.0** (Authorization Code + PKCE): `passport-google-oauth20`
  o `google-auth-library` → valida el token/email del proveedor.
- **Identidad única**: Google provee solo **identidad** (email). Los **roles y
  permisos** proceden siempre del `User` de **nuestra BD** (el Admin crea el
  usuario con su rol). Sin auto-creación de usuarios por Google.
- **Sesión**: `access_token` (JWT, corto) + `refresh_token` (rotado, guardado
  como hash en la tabla `RefreshToken` de PostgreSQL → revocable).

## Ventajas
- Flexibilidad de acceso (Google y/o contraseña).
- Autorización centralizada sigue en el backend (RBAC por BD).
- Recuperación de acceso si falla un proveedor.

## Desventajas / costes
- Mayor superficie de integración (dependencia de Google Cloud OAuth).
- Requires crear un OAuth Client (client_id/secret) y URL de callback
  autorizada en Google Cloud Console.
- No es comprobable e2e sin credenciales/red reales → tests con mocks.

## Impacto técnico
Tabla nueva `RefreshToken` (migración NL-05). `AuthModule` + `AuthorizationModule`
de NestJS. Guards `RolesGuard`/`PermissionsGuard`. Variables de entorno:
`JWT_*` y `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` (nunca versionadas).

## Riesgos
- Dependencia de Google como IdP para acceso operativo. Mitigado por la vía de
  contraseña alternativa (C).
- Credenciales de Google deben gestionarse con cuidado (rotación, `.env`).

## Referencias
SECURITY_MODEL.md (autenticación), SECURITY_AUDIT.md (S-01/S-02),
ADR-NL-001 (backend fuente de verdad), ADR-NL-013 (auth por puerto, supersedido).
