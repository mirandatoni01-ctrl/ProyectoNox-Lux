# ADR-NL-006 — Administración: panel independiente y privado

**Estado:** VALIDADO (NL-06)
**Fecha:** 2026-08-28 · **Validado:** 2026-08-29

## Contexto
El MVP traía un panel admin integrado en el Store conmutado por un botón de rol
(no autorización real). La directiva exige una **Administración independiente y
privada**.

## Problema
Proporcionar un entorno administrativo seguro, separado del cliente.

## Opciones consideradas
- **A)** **Admin Panel** como aplicación web independiente (SPA React+TS) con
  inicio de sesión contra el backend, publicada en una URL/subdominio distinto y
  protegida (auth real + control de acceso por roles/permisos). *(elegida)*
- **B)** Reutilizar el admin integrado del Store — contradice la separación y es
  inseguro.

## Decisión propuesta
Crear **Admin Panel** separado (`apps/admin`) que consume la misma API
(ADR-NL-001, ADR-NL-002). Sobre él se construyen la gestión de productos,
variantes, inventario, pedidos, clientes, media y usuarios/roles (NL-06-10).

## Ventajas
- Superficie de exposición mínima y controlada.
- Autorización real basada en roles/permisos (ADR-NL-001 backend).
- Independencia de ciclo de vida frente al Store.

## Desventajas
- Duplicidad de UI base (mitigada con paquete de design compartido).

## Impacto técnico
Migración del selector de rol/admin integrado: la funcionalidad se **elimina del
Store** y se reconstruye en el Admin (NL-06). Autorización vía JWT/roles (ver
SECURITY_MODEL.md).

## Validación (NL-06)
- Panel SPA con **react-router v7** (SPA multi-página) en `apps/admin`, puerto
  dev 5174. Login real contra la API (`POST /api/auth/login`) con
  auto-restauración de sesión y logout con revocación.
- Decisión de sesión: **access token en memoria + refresh en sessionStorage**
  con rotación. RBAC por roles/permisos expuestos por `GET /api/auth/me`.
- `DevAuthRepository` como fallback **solo desarrollo** (`VITE_AUTH_MODE=dev`);
  nunca en producción. Exigencia: build de prod en `api` solo.
- Gestión de catálogo operativa (crear/editar/alta-baja) y placeholders para los
  módulos de NL-08..NL-10.

## Riesgos
Ventana temporal sin admin mientras se construye el externo (transición en
MIGRATION_STRATEGY.md).
