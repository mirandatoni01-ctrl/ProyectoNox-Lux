# RELEASE PLAN — NOX & LUX

**Bloque:** NL-01 (original) · **revisado en NL-00 (redirección 3-sistemas)**

## Niveles de producción

```
MVP → REDIRECCIÓN 3-SISTEMAS (NL-00) → STORE/ADMIN/BACKEND sobre API
      (NL-01..11) → TESTING & SEGURIDAD (NL-12) → STAGING (NL-13) →
      PRODUCCIÓN (NL-14)
```

## Estado actual

- **Nivel:** **TESTING & SEGURIDAD completado (NL-12) ✅**: configuración
  fail-fast (validación estricta de entorno), rate limiting por IP por ruta
  (login/refresh/orders/global → 429), `helmet` (headers + CSP `default-src
  'self'`), filtro global de errores sin leaks, refresh tokens con rotación +
  replay (revoca la familia), media validada por magic bytes, PII enmascarada,
  paginación acotada (limit 1..100), **auditoría central** (`GET /api/audit`),
  CSP + guard PROD en Store/Admin, y **cobertura con umbrales 80/70/80/80**
  (API 93/76/95/94). Store subordinado al API desde **NL-11** ✅ (catálogo desde
  `GET /api/products/catalog`, checkout contra `POST /api/orders`, total
  server-side, `whatsappLink` del servidor, IndexedDB como caché offline
  last-known-good). **Admin Panel independiente operativo desde NL-06** (sesión
  contra la API, access en memoria + refresh rotable), **CRUD de productos sobre
  la API desde NL-07**, **gestión de inventario/stock desde NL-08**, **media real
  desde NL-09** y **pedidos persistentes + WhatsApp vía API desde NL-10**.
  **Auth/RBAC del backend activa desde NL-05** (login dual Google + contraseña,
  JWT access/refresh, guards de roles/permisos).
- **NL-13 (recorte funcional) completado ✅ (0.13.0):** cuenta de comprador
  (registro público `POST /auth/register/customer`, perfil, cambiar contraseña,
  Google auto-registro), historial `GET /orders/mine`, pasarela "Contact Us"
  (`ContactTicket` + módulos Users/Tickets en el Admin) y gestión de
  usuarios/tickets con RBAC (`usuarios:*`, `tickets:*`, rol `CUSTOMER`). Store
  gana la tab «CUENTA» + checkout auto-identificado; Admin gana `/usuarios`,
  `/tickets` y atajo "Nuevo producto". Versionado 0.13.0 / 0.3.2 / 0.1.2.
- Próximo bloqueo del roadmap: **NL-13 — Staging (aprovisionamiento/validación
  real)**. La **decisión de infraestructura ya está tomada (ADR-NL-007 / INFRA-001):
  Hetzner Cloud, región Ashburn (US East), PostgreSQL auto-gestionada** — ver
  DEPLOYMENT_STRATEGY.md. El Object Storage (S3-compatible) y la integración real
  de WhatsApp (provider no-fake) se activarán en NL-13/14 bajo el mismo contrato
  del driver; el rate limiting pasará a un store compartido (Redis) al escala.

## Roadmap propuesto (NL-01..14)

> Propuesta a validar por el PO tras NL-00. Detalle en MIGRATION_STRATEGY.md.

| Bloque | Entregable |
|---|---|
| NL-00 | Redirección & Discovery (este) ✅ |
| NL-01 | Arquitectura foundation (monorepo, paquete compartido) ✅ |
| NL-02 | Estructura repo (monorepo: apps/store, apps/admin) ✅ |
| NL-03 | Backend foundation (NestJS + Prisma + Argon2id + REST) ✅ |
| NL-04 | Base de datos / modelo (PostgreSQL + seed) ✅ |
| NL-05 | Auth y acceso admin (RBAC) ✅ |
| NL-06 | Admin Panel (app independiente; retirar admin del Store) ✅ |
| NL-07 | Productos / variantes (CRUD + lectura store) ✅ |
| NL-08 | Inventario (stock, movimientos, auditoría) ✅ |
| NL-09 | Media (subida de imágenes, local servida por API; S3 en NL-13/14) ✅ |
| NL-10 | Pedidos y WhatsApp (vía API) ✅ |
| NL-11 | Store consume API (repositorios REST; local → offline) ✅ |
| NL-12 | Testing & seguridad (cobertura, hardening, auditoría) ✅ |
| NL-13 | Staging — **recorte funcional ✅ (0.13.0):** cuenta comprador, historial, Contact Us, gestión usuarios/tickets. Infra **ACEPTADA: Hetzner @ Ashburn**; aprovisionamiento/validación real **pendiente** |
| NL-14 | Producción |

## Gate de producción

No se pasa a PRODUCCIÓN sin:
- Decisión de **infraestructura** (ADR-NL-007 / INFRA-001) ✅ **ACEPTADA:
  Hetzner @ Ashburn** — pendiente el aprovisionamiento/validación real (NL-13/14).
- **Auth/RBAC real** (NL-05) ✅ y modo demo retirado del Store (NL-06) ✅.
- **Admin autenticado contra la API** (no `DevAuthRepository` en producción)
  — el `VITE_AUTH_MODE=dev` del Admin debe estar prohibido en staging/prod.
- **Número WhatsApp** real configurado.
- **Backend + PostgreSQL** como fuente de verdad (NL-03..NL-11).
- **Auditoría y hardening** (NL-12) ✅ — auditoría central `GET /api/audit`,
  rate limiting, helmet/CSP, filtro de errores sin leaks, fail-fast de entorno,
  refresh con replay, media por magic bytes, cobertura con umbrales.

El modo demo (botón de rol, persistencia local) es solo de desarrollo.

## Criterios heredados del MVP (históricos)

- [x] Proyecto ejecutable (Vite + React + TS + Tailwind).
- [x] Build sin errores de tipos.
- [x] Pruebas mínimas (smoke + repositorios) pasando.
- [x] Persistencia local (fallback/desarrollo).
- [x] Migrar persistencia al backend (NL-11).
- [x] Pedido persistente y WhatsApp vía API (NL-10).
- [x] Imágenes reales vía media del backend (NL-09).
