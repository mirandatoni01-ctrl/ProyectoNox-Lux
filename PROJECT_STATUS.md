# PROJECT STATUS — NOX & LUX

```
PROJECT: NOX & LUX

VERSION: 0.13.0
ARCHITECTURE VERSION: v1.0 (3-SISTEMAS: STORE / ADMIN / BACKEND)

STATUS: NL-13 AJUSTES FUNCIONALES COMPLETADOS · APROVISIONAMIENTO DE INFRA PENDIENTE
CURRENT PHASE: Fase 06 (Staging / despliegue)
CURRENT BLOCK: NL-13 — Cuentas de comprador + soporte (F-29/F-30/F-31) COMPLETADO; infra Hetzner documentada, sin aprovisionar

LAST COMPLETED BLOCK: NL-13 (recorte) — Ajustes funcionales: cuenta comprador, historial de pedidos, Contact Us, gestión de usuarios/tickets en Admin

NEXT BLOCK: NL-13 — Aprovisionamiento/validación real · Hetzner @ Ashburn / NL-14 Producción

--- SISTEMAS (monorepo npm) ---
STORE:   apps/store (@nox-lux/store) — App de comprador (React + TS + Vite + Tailwind).
         Consume la API desde NL-11: catálogo `GET /api/products/catalog` (stock/reserved
         reales), checkout `POST /api/orders` (total server-side + whatsappLink), IndexedDB
         como caché offline last-known-good (sin SW). Publica con CSP (build).
         NL-13: cuenta de comprador (registro/login), CHECKOUT AUTO-IDENTIFICADO
         (token Bearer + prefill perfil), historial `GET /orders/mine` y "Contact Us"
         (`POST /tickets`) para logueados. SessionStorage `noxlux.accessToken`.
ADMIN:   apps/admin (@nox-lux/admin) — Panel independiente OPERATIVO (NL-06..13): login JWT
         contra la API (access en memoria + refresh rotable), productos/inventario/media/
         pedidos + usuarios y tickets sobre REST con RBAC. En PROD fuerza backend real
         (`VITE_AUTH_MODE=api`). Publica con CSP (build).
         NL-13/recorte: gestión de USUARIOS (`/usuarios`) y TICKETS (`/tickets`) de
         soporte, atajo "Nuevo producto" en Inventario.
BACKEND: services/api (@nox-lux/api) — OPERATIVO con PostgreSQL 18 real: NestJS 12 + Prisma 7
         + Argon2id + Zod. Productos, inventario, media, pedidos/WhatsApp, auth/RBAC.
         NL-12 hardening: rate limiting por IP (429), helmet/CSP, filtro de errores sin leaks,
         refresh con rotación+replay, media por magic bytes, auditoría central
         `GET /api/audit`, paginación acotada, fail-fast de entorno.
         NL-13/recorte: rol CUSTOMER + perfil (`PATCH /auth/me`, `changePassword`), registro
         público (`POST /auth/register/customer`), Google auto-registro, `GET /orders/mine`,
         módulo Users (`GET/PATCH /api/users`) y Tickets (`GET /api/tickets`,
         `PATCH /api/tickets/:id/status`), guard opcional `OptionalJwtAuthGuard`.
SHARED:  packages/shared (@nox-lux/shared) — Tipos de dominio compartidos (fuente de verdad
         tipada): `ProductVariant` (id/reserved/sku/status), `CartItem.productVariantId`,
         `Order.whatsappLink?`. Nota: es TS-source; el backend aún no lo importa en runtime.

--- DATABASE / SECURITY / INFRAESTRUCTURA ---
DATABASE:      PostgreSQL 18 nativo (servicio Windows postgresql-x64-18, puerto 5432)
               OPERATIVO para desarrollo (NL-07, opción del PO): BD `nox_lux` con rol
               `nox_lux` (DATABASE_URL local, host `127.0.0.1` por fix IPv6). Migraciones
               `0_init`, `nl05_refresh_token` y las del recorte NL-13
               (`nl13_profile_customer`, `contact_ticket_profile_fields`) aplicadas con
               `prisma migrate dev`; seed aplicado (catálogo 6 productos + RBAC + admin
               bootstrap + rol CUSTOMER). docker-compose (postgres:16) queda para CI.
               Procedimiento documentado en la carpeta de documentación del PO (NL-07).
SECURITY:      Modelo dual IMPLEMENTADO (NL-05): login por contraseña (Argon2id)
               y/o Google OAuth (identidad); sesiones JWT access corto + refresh con
               rotación/revocación y detección de replay (revoca la familia, NL-12).
RBAC funcional (RolesGuard/PermissionsGuard, roles/permisos en BD,
                comodín '*' SUPER_ADMIN). NL-12: fail-fast de entorno, rate limiting
                por IP, helmet/CSP, filtro de errores sin leaks, media por magic bytes,
                mass-assignment 400, auditoría central `GET /api/audit`, password ≥12.
                SECURITY_AUDIT S-01 a S-06 cerradas/mitigadas.
                NL-13/recorte: rol CUSTOMER (sin permisos de panel), permisos
                `usuarios:ver/gestionar` y `tickets:ver/gestionar` (ADMIN incluye
                usuarios/tickets, excluye `usuarios:gestionar`/`auditoria:ver`).
INFRAESTRUCTURE: DECIDIDA (NL-13, PO) — **Hetzner Cloud, región Ashburn (US East),
               PostgreSQL auto-gestionada** (ADR-NL-007 / INFRA-001 ACEPTADOS).
               Documentado en DEPLOYMENT_STRATEGY v1.1. Aprovisionamiento/validación
               real pendiente según itinerario NL-13/14 (aún sin desplegar).

--- ADR ---
Nuevos (dirección): ADR-NL-001 Backend propio · 002 Separación Store/Admin ·
003 Fuente de verdad · 004 Modular Monolith · 005 PostgreSQL · 006 Admin externo.
Validados en NL-03: ADR-NL-001 (backend), ADR-NL-004 (Modular Monolith),
ADR-NL-005 (config Prisma/PostgreSQL). Validado en NL-04: ADR-NL-005 (modelo).
Validados en NL-06: ADR-NL-002 (separación Store/Admin) y ADR-NL-006 (panel externo
privado). NL-07 valida ADR-NL-003 (fuente de verdad) con el CRUD REST sobre
PostgreSQL. **ADR-NL-007 e INFRA-001 ACEPTADOS (NL-13)** — proveedor Hetzner @
Ashburn, PG auto-gestionada.
Estructural: ADR-NL-017 (monorepo npm) IMPLEMENTADO, ADR-NL-018 (auth dual) IMPLEMENTADO,
ADR-NL-019 (Store consume API) IMPLEMENTADO, ADR-NL-020 (rate limiting + CSP) IMPLEMENTADO.
Renumerados (históricos): ADR-NL-011..016 (mapa en docs/adr/README.md).

--- TEST STATUS ---
STORE: Vitest + Testing Library + fake-indexeddb. 22/22 tests passing. Build OK (+CSP). lint limpio.
ADMIN: Vitest + Testing Library + fake-indexeddb. 53/53 tests passing. Build OK (+CSP). lint limpio.
API:   jest + @swc/jest. Unit 160/160 (25 suites; cobertura 93/76/95/94 % > umbral 80/70/80/80)
       + e2e 69/69 (7 suites, incl. security 15). Build OK · lint limpio · Audit: 0.
       Validado EN VIVO contra PostgreSQL 18: auth, catálogo, CRUD productos, inventario,
       media, pedidos/reservas, y NL-12 (429, 403, replay, headers, auditoría, paginación).

--- KNOWN RISKS ---
- Aprovisionamiento/validación real del entorno aún pendiente (NL-13/14). La
  latencia estimada a Colombia y el tráfico 1 TB/mes (región US de Hetzner) deben
  validarse en staging.
- Reglas de inventario/pedidos (reserva, descuentos, estados) sin definir por el PO.
- Coste de re-ingeniería del backend desde cero.
- El stock se expone como solo-lectura (crear/editar no lo reciben): el Admin
  muestra 0 hasta NL-08 (escribir inventario) — decisión de alcance documentada.
- Una migración `prisma migrate dev` necesita `ALTER ROLE nox_lux CREATEDB`
  (shadow DB); ver PROCEDIMIENTO_SQL en la doc del PO.
- Carrito usa id compuesto de texto; stock no validado → resolverán backend+API.
- (resuelto NL-03) deepmerge-ts en Prisma 7: fijado a v8 vía override anidado (0 vuln).
- (técnico) `@node-rs/argon2` (binario) se stubbea en jest; se valida en runtime.
- (técnico) backend no importa `@nox-lux/shared` (TS-source) en runtime aún.
- (NL-05) Google OAuth: flujo verificado con mocks; validación real requiere
  credenciales de Google en `.env` (PO) y callback autorizado en Cloud Console.
- (NL-06/07) `DevAuthRepository`/`LocalProductRepository` NO deben usarse en
  producción: usar `VITE_AUTH_MODE=api` y revisarlo en el paso de CI/CD.

--- DECISIONS PENDING (requieren confirmación del PO) ---
- Proveedor de infraestructura (ADR-NL-007 / INFRA-001) ✅ **ACEPTADO (NL-13):
  Hetzner @ Ashburn, PG auto-gestionada** — pendiente aprobar el aprovisionamiento
  del entorno staging (NL-13/14).
- Integración real de WhatsApp (provider no-fake) y Object Storage (S3) → NL-13/14.
- Retención de auditoría y requisitos legales (RGPD/ARCO).
- (resuelto NL-12) Intentos de login → rate limiting por IP (429); bloqueo por
  usuario queda como futura política. Política de contraseñas: mín. 12 (zod).
- (resuelto NL-12) Cobertura y hardening implementados con umbrales 80/70/80/80.

--- BLOCKERS (técnicos) ---
- Ninguno en el monorepo. PostgreSQL 18 local activo; Docker solo para CI.
- Aprovisionamiento del entorno staging/producción pendiente de aprobación (NL-13/14).

LAST VERIFIED: 2026-08-31 (NL-12: API unit 160/160 + e2e 69/69 + cobertura 93/76/95/94,
Store 22/22, Admin 53/53, builds OK, lint limpio, audit 0 · NL-13 doc: decisión de
infraestructura ACEPTADA, sin cambios de código)
```
