# FUNCTIONALITY MATRIX — NOX & LUX

**Fase:** 02 — Auditoría
**Bloque:** NL-00 (revisado según la nueva arquitectura STORE/ADMIN/BACKEND)

## Leyenda de clasificación (destino arquitectónico)

- **STORE / ADMIN / BACKEND**: sistema donde vive la funcionalidad en la nueva
  arquitectura.
- **MIGRAR / DEPRECADA / CONSERVAR / ELIMINAR**: destino de la implementación
  actual (ver MIGRATION_STRATEGY.md).

| ID | Funcionalidad | Estado | Ubicación actual | Destino arquitectónico | Riesgo |
|---|---|---|---|---|---|
| F-01 | Catálogo (grid) | REAL | `src/app/App.tsx` | **STORE** (lee API · NL-11 ✅) | Bajo |
| F-02 | Búsqueda | REAL | `src/app/App.tsx` | **STORE** | Bajo |
| F-03 | Filtro material | REAL | `src/app/App.tsx` | **STORE** | Bajo |
| F-04 | Filtro categoría | REAL | `src/app/App.tsx` | **STORE** | Bajo |
| F-05 | Detalle producto | PARCIAL | modal en `App.tsx` | **STORE** | Medio |
| F-06 | Selector variante/talla | PARCIAL | `App.tsx` (por índice) | **STORE**/BACKEND (variantes reales NL-07) | Medio |
| F-07 | Agregar al carrito | PARCIAL | `App.tsx` (id compuesto) | **STORE** (variantId real · NL-11 ✅) | Alto |
| F-08 | Carrito / totales | REAL | Store hook local | **STORE** | Bajo |
| F-09 | Actualizar cantidad | PARCIAL | `App.tsx` (sin límite stock) | **STORE** + BACKEND (no-sobreventa por reservas, NL-10 ✅; lectura API NL-11 ✅) | Alto |
| F-10 | Pedido WhatsApp | REAL (NL-10) | `POST /api/orders` (server-side) + mensaje/enlace wa.me → `FakeWhatsAppProvider` | **BACKEND** (NL-10 ✅); real Meta/Twilio en NL-13/14 | Alto |
| F-11 | Cambio de rol | RIESGO | botón en `App.tsx` | **ELIMINADA** (NL-06; auth real NL-05) | Crítico |
| F-12 | Listado admin | REAL | `apps/admin` (`ProductsPage`) sobre API REST | **ADMIN** (NL-06/07 ✅) | Medio |
| F-13 | Activar/desactivar | REAL | `apps/admin` (`toggleActive` → `POST /api/products/:id/toggle`) | **ADMIN** (NL-06/07 ✅) | Medio |
| F-14 | Editar producto | REAL | `apps/admin` (modal → `PATCH /api/products/:id`) | **ADMIN** (NL-07 ✅) | Medio |
| F-15 | Crear producto | REAL | `apps/admin` (formulario → `POST /api/products`) | **ADMIN** (NL-07 ✅) | Medio |
| F-16 | Cámara | SIMULADA | `App.tsx` (URL aleatoria) | **ADMIN**/BACKEND media (NL-09); captura real en NL-10+ | Medio |
| F-17 | Galería | REAL (NL-09) | `apps/admin` (`MediaPage` + `ImageUploader`) → `GET/POST/DELETE /api/media` | **ADMIN** + **BACKEND** (NL-09 ✅) | Medio |
| F-18 | Persistencia | REAL | API REST + PostgreSQL 18 (antes IndexedDB) | **BACKEND** (NL-04/07 ✅); local → fallback dev | Alto |
| F-19 | Autenticación | IMPLEMENTADA | `BACKEND auth` + login/refresh en `apps/admin` | **BACKEND** (NL-05 ✅) + ADMIN (NL-06 ✅) | Crítico |
| F-25 | Inventario / stock (ver + ajustar) | REAL | `apps/admin` (`InventarioPage`) → `GET/PUT /api/inventory` + `POST :id/adjust` | **ADMIN** + **BACKEND** (NL-08 ✅) | Medio |
| F-26 | Stock en alta/edición de producto | REAL | form. del Admin envía `stock` por variante → inventa inicial (ledger) | **BACKEND** (NL-08 ✅) | Medio |
| F-20 | Pedidos persistentes | REAL (NL-10) | `POST/GET /api/orders` + `PATCH :id/status` → Order/OrderItem/Customer en PG; Admin `/pedidos` | **BACKEND** + **ADMIN** (NL-10 ✅); Store consume API · NL-11 ✅ | Alto |
| F-21 | Pagos | NO IMPLEMENTADA | — | **FUTURO** (post MVP reales) | Futuro |
| F-22 | Imágenes reales | REAL (NL-09) | BACKEND media local servida por API (`/api/media/file/:key`) → galería multi-imagen y primaria en `products` | **BACKEND** (NL-09 ✅); Object Storage S3 en NL-13/14 | Medio |
| F-29 | Cuenta de comprador (registro/login + perfil) | REAL (NL-13/recorte) | `POST /auth/register/customer`, `POST /auth/login`, `PATCH /auth/me`, `PATCH /auth/me/password`, `POST /auth/me/google/(un)link`; Store `AuthProvider` + tab «CUENTA» | **BACKEND** + **STORE** (NL-13 ✅) | Alto |
| F-30 | Gestión de usuarios (Admin) | REAL (NL-13/recorte) | `GET/PATCH /api/users` (`roleCodes?`/`isActive?`); Admin `/usuarios` (lista + activar/desactivar) | **BACKEND** + **ADMIN** (NL-13 ✅; RBAC `usuarios:*`) | Crítico |
| F-31 | Soporte «Contact Us» + tickets | REAL (NL-13/recorte) | Store `POST /tickets` (opcional autenticado) + `GET /api/tickets`/`PATCH :id/status`; Admin `/tickets` | **BACKEND** + **STORE** + **ADMIN** (NL-13 ✅; RBAC `tickets:*`) | Medio |

### Decisión de clasificación (justificación)

- **F-11 (cambio de rol)**: ELIMINADA en NL-06 (selector y admin integrado
  retirados del Store; ver ADR-NL-002/006 y SECURITY_AUDIT S-01).
- **F-16/F-22 (cámara/imágenes)**: SIMULADA → media real en el backend desde
  NL-09 (ADR-NL-015: migrar al Object Storage en NL-13/14 bajo el mismo
  contrato del driver `MediaStorage`); la cámara de captura queda en el Admin
  como mejora posterior.
- **F-17 (galería)**: implementada en NL-09 — página Media del Admin con
  subida/borrado y galería multi-imagen (con primaria) en el alta/edición de
  producto. Validaciones: mimes JPEG/PNG/WEBP/GIF y UPLOAD_MAX_MB.
- **F-18 (persistencia)**: se reclasifica; el IndexedDB deja de ser fuente de
  verdad y pasa a fallback (ADR-NL-003/012).
- **F-25/F-26 (inventario)**: añadidas en NL-08 — escritura de stock contra la
  API con ledger de movimientos (`STOCK_MOVEMENTS`) y auditoría; el alta/edición
  de producto envía el `stock` por variante. La validación de no sobrevender
  (F-09/F-07) se resuelve en el backend desde NL-10: **las reservas (`reserved`)
  viven con los pedidos y `available = stockOnHand − reserved`** se valida al
  crear el pedido (409). El Store migra la lectura de stock a la API en NL-11.
- **F-10/F-20 (pedido WhatsApp + persistencia)**: implementadas en NL-10 — el
  pedido del Store se persiste en PostgreSQL (Order/OrderItem/Customer) con
  validación de stock y reservas; el mensaje y el enlace `wa.me` (número de
  negocio `WHATSAPP_NUMBER`) se construyen en el servidor y el envío usa el
  puerto `WhatsAppProvider` (fake/log en NL-10; integración real en NL-13/14).
- **NL-11 (el Store consume la API)**: F-01 (catálogo) definitivo REAL — se
  lee `GET /api/products/catalog` (público) con `stock`/`reserved` reales por
  variante; F-07/F-09 (carrito/cantidades) pasan a variantes reales
  (`productVariantId`) y a la disponibilidad `stock − reserved`; F-10 (pedido)
  usa el `whatsappLink` del **servidor**; F-18 (persistencia) cumple el
  ADR-NL-003: IndexedDB queda como **caché offline last-known-good** (sin SW).
  Para el comprador la app es 100% subordinada al backend.
- **NL-12 (testing & seguridad)**: hardening transversal — rate limiting por IP
  (429 en login/refresh/orders/global), headers de seguridad (helmet/CSP), filtro
  global de errores sin leaks, refresh con rotación + replay (revoca la familia),
  media validada por **magic bytes**, paginación acotada (limit 1..100), schemas
  zod estrictos (mass-assignment → 400), y **auditoría central** `GET /api/audit`
  (F-19/F-25/F-20/`media`/products ahora trazan al actor). Ambos clientes
  publican con CSP; el Admin en PROD fuerza backend real. Backend con cobertura
  mínima 80/70/80/80 (ver TEST_REPORT y ADR-NL-020).
- **NL-13 (Staging, documentación)**: decisión de infraestructura **ACEPTADA
  (PO)** — **Hetzner Cloud, región Ashburn (US East), PostgreSQL auto-gestionada**
  (ADR-NL-007 / INFRA-001). F-10/F-20 (WhatsApp real) y F-22 (Object Storage S3)
  permanecen pendientes hasta el despliegue/validación real (NL-13/14); no se
  migra media ni se integra WhatsApp real en este bloque.
- **NL-13 (recorte funcional, 0.13.0 ✅)**: F-29 (cuenta de comprador),
  F-31 ("Contact Us" → `ContactTicket` + `tickets:*`) y F-30 (gestión de usuarios
  → `usuarios:*`) quedan REALES: rider ofrece registro/login + tab «CUENTA» +
  historial `GET /orders/mine` + checkout auto-identificado; el Admin gana
  `/usuarios`, `/tickets` y atajo "Nuevo producto"; rol `CUSTOMER` sin permisos de
  panel. La **suplantación de claves** (p. ej. `usuarios:gestionar`/`auditoria:ver`)
  queda reservada a SUPER_ADMIN.
