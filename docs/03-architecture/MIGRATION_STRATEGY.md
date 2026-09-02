# MIGRATION_STRATEGY — NOX & LUX

**Versión:** 1.0
**Fecha:** 2026-08-28
**Relacionados:** ARCHITECTURE_BLUEPRINT_V1.md, ADR-NL-001..007, docs/adr/README.md.

## Propósito

Definir cómo evolucionar el código del MVP (una web app con IndexedDB) hacia la
arquitectura de 3 sistemas (STORE/ADMIN/BACKEND), evitando pérdidas y regresiones,
y registrando la reclasificación de cada parte.

---

## 1. Clasificación del código actual del MVP

| Clasificación | Elemento | Destino | Bloque |
|---|---|---|---|
| **CONSERVAR** | Tipos base (`src/types`): Product, ProductVariant, CartItem | Store (mapeado a API) | NL-03/04 |
| **CONSERVAR** | Constantes / catálogo / búsqueda / filtros | Store | — |
| **CONSERVAR** | Identidad visual (index.css, layout, tema) | Store + Admin (paquete compartido) | NL-01/02 |
| **CONSERVAR (ref)** | `nox_lux_mobile_application.tsx` (histórico MVP) | carpeta de referencia | — |
| **REFACTORIZAR** | Monolito `App.tsx` (958 líneas) | separar UI Store vs Admin | NL-01/02/06 |
| **MIGRAR** | `ProductRepository` / `CartRepository` (ports existentes) | implementación REST contra API | NL-11 |
| **MIGRAR (Admin)** | `ProductRepository` del Admin (IndexedDB) | `ApiProductRepository` REST (NL-07) | NL-07 |
| **MIGRAR** | `INITIAL_PRODUCTS` | datos semilla (seed) del backend | NL-04 |
| **MIGRAR** | WhatsApp (número en env) | envío/pedido vía API | NL-10 |
| **MIGRAR** | Modelo Product/Variant/CartItem | entidades PostgreSQL relacionales | NL-04 |
| **MIGRAR** | Imágenes (URLs externas / cámara simulada) | Media backend (local servida por API; S3-compatible en NL-13/14) | NL-09 ✅ |
| **DEPRECADA** | Selector de rol CUSTOMER/ADMIN | eliminar del Store | NL-06 |
| **DEPRECADA** | Panel admin integrado (modales) | reconstruir en Admin externo | NL-06 |
| **NO TOCAR** | `esto no tiene que ver con el proyecto no tocar.txt` | intacto | — |

---

## 2. Reconciliación de ADR

La nueva directiva redefine ADR-NL-001..007. Los ADR históricos se renumeraron a
ADR-NL-011..016. Mapa completo en `docs/adr/README.md`. Reclasificación:

- **ADR-NL-012 (persistencia local-first)** → queda como fallback/desarrollo; ya
  **no** es la fuente de verdad (ADR-NL-003).
- **ADR-NL-013 (auth por puerto local)** → supersedido en producción por auth
  real del backend (ADR-NL-001/006).
- **ADR-NL-015 (imágenes locales)** → migrar a Object Storage.
- **ADR-NL-016 (WhatsApp env)** → el pedido vía WhatsApp pasa por la API.

---

## 3. Orden de migración y bloques (roadmap NL)

| Bloque | Nombre | Contenido | Depende de |
|---|---|---|---|
| NL-00 | Redirección y descubrimiento | este documento + blueprint + ADR | — |
| NL-01 | Arquitectura foundation | estructura del monorepo puede empezar; decidir monorepo | NL-00 ✓ |
| NL-02 | Estructura repo (monorepo) | apps/store, apps/admin, services/api, packages/shared | NL-01 ✓ |
| NL-03 | Backend foundation | NestJS + TS + Prisma + Argon2id + REST/OpenAPI + Zod. Modular monolith | NL-02 ✓ |
| NL-04 | Base de datos / modelo | PostgreSQL, entidades, seed; migraciones | NL-03 ✓ |
| NL-05 | Auth y acceso admin | auth + RBAC + primeros usuarios/roles | NL-04 ✓ |
| NL-06 | Admin Panel | app admin independiente; CRUD básico; retirar admin del Store | NL-05 |
| NL-07 | Productos / variantes | CRUD productos y variantes (admin) + lectura (store) | NL-06 |
| NL-08 | Inventario | stock, movimientos (ledger), auditoría; reservas con pedidos (NL-10) | NL-07 |
| NL-09 | Media | subida de imágenes (local servida por API); S3-compatible en NL-13/14 | NL-08 |
| NL-10 | Pedidos y WhatsApp | pedidos/order_items, estados, notificación WhatsApp vía API | NL-08/09 |
| NL-11 | Store consume API | repositorios del Store → REST; persistencia local solo offline/fallback | NL-10 |
| NL-12 | Testing y seguridad | cobertura end-to-end, rate limit, auditoría, hardening ✅ | NL-11 ✅ |
| NL-13 | Staging | **recorte funcional ✅ (0.13.0):** cuenta comprador, historial, Contact Us, gestión usuarios/tickets · infra **ACEPTADA: Hetzner @ Ashburn**; aprovisionamiento/validación real pendiente | NL-12 ✅ |
| NL-14 | Producción | lanzamiento real | NL-13 |

> Los bloques NL-01..14 son una **propuesta** que se ajustará tras NL-00 según
> las respuestas del PO (infra, inventario, pedidos).
>
> **Ejecutados:** NL-00 ✅ · NL-01 ✅ · NL-02 ✅ · NL-03 ✅ · NL-04 ✅ ·
> NL-05 ✅ (auth + RBAC) · NL-06 ✅ (Admin Panel independiente + retirada del
> admin/rol del Store) · NL-07 ✅ (CRUD REST productos/variantes + Admin sobre
> la API + catálogo público) · NL-08 ✅ (inventario: stock/ledger/auditoría +
> Admin de inventario + stock en alta/edición de producto) · NL-09 ✅ (media:
> subida de imágenes real, local servida por API; galería multi-imagen +
> ImageUploader/MediaPage del Admin) · **NL-10 ✅ (pedidos + WhatsApp vía API:
> `POST/GET /api/orders`, `PATCH :id/status`, reservas y no-sobreventa reales,
> ledger `reserve`/`release`, mensaje/wa.me server-side con FakeWhatsAppProvider;
> Admin `/pedidos`)** · **NL-11 ✅ (Store consume API: catálogo desde
> `GET /api/products/catalog` con stock/reserved reales, checkout `POST
> /api/orders` anónimo con total server-side y `whatsappLink` del servidor;
> IndexedDB pasa a caché offline last-known-good sin SW)** · **NL-12 ✅ (Testing
> & seguridad: hardening del backend — config fail-fast, rate limiting por IP
> (429), helmet/CSP, filtro de errores sin leaks, refresh con rotación+replay,
> media por magic bytes, paginación acotada, mass-assignment 400; auditoría
> central `GET /api/audit`; CSP + guard PROD en Store/Admin; cobertura API con
> umbrales 80/70/80/80)** · **NL-13 ✅ (recorte funcional, 0.13.0): cuenta de
> comprador (registro público `POST /auth/register/customer`, perfil
> `PATCH /auth/me`, cambiar contraseña, Google auto-registro), historial
> `GET /orders/mine`, pasarela "Contact Us" (`ContactTicket`) y gestión de
> usuarios/tickets en el Admin con RBAC (`usuarios:*`, `tickets:*`, rol
> `CUSTOMER`). Infra **ACEPTADA (NL-13): Hetzner Cloud, región Ashburn (US East),
> PostgreSQL auto-gestionada** (ADR-NL-007 / INFRA-001); plan en
> DEPLOYMENT_STRATEGY.md. El aprovisionamiento/validación real queda para el
> itinerario NL-13/14 (aún sin desplegar).

---

## 4. Estrategia de transición (bajo riesgo)

1. **Conservar funcionalidad** mientras se construye el backend (MVP sigue
   operativo con persistencia local).
2. **Construir en paralelo**: el API no toca el código Store hasta NL-10/11.
3. **Migrar por capas**: primero API+BD (fuente de verdad), luego Store comienza a
   leer del API, y el Admin reemplaza al panel integrado.
4. **Eliminación tardía**: el selector de rol y el admin del Store solo se
   eliminan cuando el Admin externo esté funcional (NL-06+).
5. **Semillas**: `INITIAL_PRODUCTS` se usa para poblar PostgreSQL en NL-04.

## 5. Estados de transición de la fuente de verdad

| Etapa | Fuente de verdad |
|---|---|
| Hoy (MVP) | IndexedDB cliente |
| NL-03..NL-06 | API+PostgreSQL en paralelo (Store y Admin usan local) |
| NL-07..NL-10 | API+PostgreSQL (Admin: CRUD por REST + pedidos; el Store aún usa local en paralelo) |
| NL-11 | API (local pasa a offline/fallback) ✅ |
| NL-12 | API (hardening/seguridad activo) ✅ |
| NL-13 | API (cuentas de comprador + soporte + usuarios/tickets ✅; despliegue en NL-13/14) |
| Producción | API+PostgreSQL exclusivo |

---

*Actualizar según evolucione el roadmap y las decisiones del PO.*
