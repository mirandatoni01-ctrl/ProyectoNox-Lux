# TEST REPORT — NOX & LUX

**Bloque:** NL-02 (histórico) · **Actualizado:** NL-13 (2026-09-02)

## Estado actual (NL-13)

| Suite | Resultado |
|---|---|
| Store (Vitest) | ✅ **22/22** (repositories: LocalProduct caché 5 + LocalCart 4 = 9 · api-repositories: **ApiProduct 3 + CachedProduct 3 + ApiOrder 4** = 10 · App smoke 1 · **checkout UI 2**) |
| Admin (Vitest) | ✅ **53/53** (ApiAuth 8, DevAuth 5, LocalProduct 5, AuthProvider 3, smoke 2, ApiProductRepo+mappers 16, ApiInventoryRepo 6, ApiMediaRepo 5, **ApiOrderRepo 6**) |
| API unit (jest) | ✅ **182/182** — 29 suites (… + **UsersService/UsersController, TicketsService/TicketsController — NL-13/recorte**) |
| API e2e (jest) | ✅ `test/*.e2e-spec.ts` (auth, health, products, inventory, media, orders, security) — validación en vivo por curl en NL-13 |
| **Cobertura API** | ✅ **88.34% statements · 71.15% branches · 89.04% functions · 88.57% lines** (umbrales 80/70/80/80) |
| Lint (oxlint) | ✅ API + Admin + Store limpios (Store sin errores; avisos fast-refresh/set-state-in-effect) |
| Builds | ✅ Admin (`tsc -b && vite build` + CSP), API (`nest build`), Store (`tsc -b && vite build` + CSP) |
| Audit (`npm audit`) | ✅ **0 vulnerabilidades** (raíz, tras fijar `qs`→6.16.0 y eliminar el engine MySQL no usado `mysql2` de `prisma@7`) |

## Verificación NL-13 — Cuentas de comprador + soporte (unitarios + e2e en vivo)

- **Unitarios:** `UsersService`/`UsersController` (listado `usuarios:ver` → 200,
  `PATCH :id` con `isActive`/`roleCodes` y `usuarios:gestionar` → 200; **403** a
  un rol sin permiso; **404** usuario inexistente; **400** mass-assignment) y
  `TicketsService`/`TicketsController` (listado `tickets:ver`, `PATCH :id/status`
  `tickets:gestionar`, validación del enum `new|in_progress|resolved|closed`,
  `adminNote`) ✅. Firma de `create` en `orders.controller` con `meta.userId`
  opcional cubierta.
- **e2e en vivo (curl, API real + PostgreSQL 18):**
  - `POST /auth/register/customer` → 201 + TokenPair; login; `GET /auth/me`
    devuelve `id/email/fullName/phone/roles` y rol **CUSTOMER** ✅.
  - `PATCH /auth/me` (perfil) y `PATCH /auth/me/password` → **204**; login con la
    nueva contraseña OK y **401** con la anterior ✅.
  - Tickets: `POST /tickets` anónimo → 201 (sin `userId`); logueado → 201 (con
    `userId`); `GET /api/tickets` (admin) lista; `PATCH :id/status` + `adminNote`
    → 200 ✅.
  - `GET /orders/mine` devuelve el historial del comprador; `GET /api/users`
    lista (admin) → **403** a un usuario CUSTOMER; **200** a un ADMIN/SUPER_ADMIN ✅.
  - Fix de conexión aplicado en `.env`: DATABASE_URL local `localhost` →
    `127.0.0.1` (IPv6 `::1` en Windows rompía Prisma/pg) ✅.

## Verificación NL-12 — Testing & seguridad (e2e + coverage)

- **Config fail-fast** (`env.spec`): secretos ausentes/ejemplo/iguales/debiles y
  CORS inválido lanzan en el boot ✅.
- **e2e de seguridad (15 casos)**: matriz RBAC (ADMIN → **403** en register y
  audit; SUPER_ADMIN → 201/200), mass-assignment → **400** (`.strict()` zod),
  token firmado con clave inválida → **401**, **replay de refresh → revoca TODA
  la familia → 401**, **429** superando el límite de `login`, headers helmet
  (`nosniff` + CSP `default-src 'self'`), CORS (origen no listado → sin
  `allow-origin`; lista permitida → reflejado), shape de errores sin stack, y
  paginación (`limit` 100 ✓ / 9999 → **400** / abc → **400**) ✅.
- **Media magic bytes**: `media.e2e` incluye caso "HTML disfrazado de PNG → 400";
  `media-storage.spec` cubre firmas jpeg/png/webp/gif y rechazos ✅.
- **Auditoría central**: `GET /api/audit` (permiso `auditoria:ver`) lista con
  filtros; escrituras en auth/inventory/media/orders/products auditan ✅.
- **Cobertura como gate**: `npm run test:coverage` (API) sobrepasa umbrales
  80/70/80/80 ✅.

### Validación en vivo (NL-10) — API real contra PostgreSQL 18
- Migración `nl10_order_movement_types` aplicada (enum `StockMovementType` +
  `reserve`/`release`) y seed idempotente con `pedidos:ver` /
  `pedidos:gestionar` ✅.
- `POST /api/orders` anónimo → 201 con `totalAmount` calculado server-side, y el
  stock queda **reservado** (`GET /api/inventory` refleja `available`) ✅.
- Pedido que exceda `available` → **409 (no sobresaturación)**; UUID inválido /
  teléfono inválido / item vacío → **400**; variante inexistente → **404** ✅.
- Transiciones: `pending→confirmed` conserva reserva; `pending→cancelled`
  libera (`release`); `confirmed→completed` consume (`stockOnHand −= qty` y
  `reserved −= qty`); transición inválida → **409**; mismo estado → **409**;
  without permiso → **403/401** ✅.
- `GET /api/orders` y `/:id` con `pedidos:ver`; `PATCH /:id/status` con
  `pedidos:gestionar`; `GET` público del catálogo intacto ✅.
- Notificación: salida `[FAKE]` en el logger del `FakeWhatsAppProvider` con el
  mensaje + enlace `wa.me` del negocio (`WHATSAPP_NUMBER`) ✅.

### Verificación NL-11 — Store consume API (unitarios + UI)
- `ApiProductRepository.listActive()` mapea `GET /api/products/catalog`:
  variantes con `id`/`sku`/`stock`/`reserved` y `imageUrl` de media resuelto a
  URL absoluta ✅.
- Red caída → `ApiError status 0`; HTTP 5xx se propaga (no se enmascara como
  offline) ✅.
- `CachedProductRepository`: online refresca la caché (last-known-good,
  `fromCache=false`); offline sirve la caché con `fromCache=true` ✅.
- `ApiOrderRepository.create` → `POST /api/orders` anónimo con
  `productVariantId + quantity`; 201 expone `totalAmount` y `whatsappLink` del
  servidor; **409** (stock) y **400** (validación) se propagan con mensaje ✅.
- Checkout UI (smoke + fireEvent): agregar al carrito → formulario
  nombre/WhatsApp → confirmar → estado éxito con **Total (servidor)** y enlace
  `wa.me` del negocio → al abrir WhatsApp **el carrito se vacía**; caso 409 →
  banner "Stock insuficiente" + refresco del catálogo ✅.
- `ProductVariant` (id/reserved/sku/status) + `CartItem.productVariantId` +
  `Order.whatsappLink?` en `@nox-lux/shared`; migración Dexie v1→v2 descarta
  carritos legados sin `productVariantId` ✅.

## Verificación NL-09 (histórico)
- Seed con los permisos `media:ver` / `media:subir` / `media:eliminar` ✅.
- `POST /api/media/upload` (multipart, mime webp/png permitido) → 201 y
  `GET /api/media/file/:key` público con content-type + `nosniff` ✅.
- Rechazos: mime no imagen → 400; sin archivo → 400; sin token → 401 ✅.
- `GET /api/media` (Bearer, `media:ver`) lista la biblioteca con producto ✅.
- `DELETE /api/media/:key` libre → 200 (blob fuera) y referenciada → **409** ✅.
- Galería multi-imagen (`images[]`) en alta/edición de producto con primaria y
  borrado de imagen (`DELETE /api/products/:id/images/:imageId`) ✅.

## Verificación NL-08 (histórico)
- Migración `nl08_stock_movements` aplicada (ledger `StockMovement`) y seed con
  el nuevo permiso `inventario:ver` ✅.
- `GET /api/inventory` (Bearer, `inventario:ver`) → 11 variantes con
  stock/reservado/disponible ✅.
- Escrituras con `inventario:editar`: `PUT /api/inventory/:id` (set absoluto,
  200) y `POST /api/inventory/:id/adjust` (delta ±, 200), cada una registrando
  `StockMovement` y `AuditLog` ✅.
- Reglas: ajuste que dejaría stock negativo → **409**; stock negativo o delta 0
  → **400**; variante inexistente → **404**; sin token → **401** ✅.
- Alta/edición de producto con `stock` por variante → inventario inicial +
  movimiento `initial`; catálogo sigue en 6 productos ✅.

## Verificación NL-07 (histórico)
- Login + `/me`, catálogo 6, CRUD 201/200/200/200/404, 401/400/403/404, 409 (unit)
  ✅.

## Resumen (histórico NL-02)

| Suite | Resultado |
|---|---|
| `src/test/App.smoke.test.tsx` | ✅ 1/1 |
| `src/test/repositories.test.tsx` | ✅ 8/8 |
| **Total** | **9 passed** |

## Detalle

### Smoke test del catálogo (cliente)
- **Qué se prueba:** que la app renderice el encabezado, la búsqueda y el estado
  vacío del catálogo (la BD inicia vacía).
- **Cómo:** Vitest + Testing Library + `fake-indexeddb` (jsdom).
- **Resultado:** ✅ VERIFICADO.

### Repositorios (`repositories.test.ts`)
- **Qué se prueba:** CRUD de productos (crear, listar, toggleActive, persistencia
  entre instancias) y de carrito (guardar, recuperar, limpiar, persistencia).
- **Cómo:** instancias reales `LocalProductRepository`/`LocalCartRepository` sobre
  `fake-indexeddb`.
- **Resultado:** ✅ 8/8 VERIFICADO.

## Comandos

- `npm run test:run` — ✅ 9/9.
- `npm run build` — ✅ sin errores TS.
- `npm run lint` — ✅ exit 0 (warnings solo en archivo de referencia).
- Dev server — ✅ HTTP 200.