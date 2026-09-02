# CHANGELOG — NOX & LUX

Todos los cambios notables se registran aquí.

## [0.13.0] — 2026-09-02 — Cuentas de comprador + soporte (rain-check NL-13: F-29/F-30/F-31)

**Recorte del bloque NL-13 ejecutado sobre la API y las apps.** El PO priorizó
los ajustes funcionales pendientes por encima de aprovisionar infraestructura
(que queda **documentado** en ADR-NL-007 / ADR-NL-INFRA-001 / RELEASE_PLAN). Este
release añade: cuenta de comprador (registro/login + perfil + contraseña),
historial de pedidos del cliente, pasarela de soporte ("Contact Us") gestionable
desde el panel, y gestión de usuarios/tickets en el Admin.

### Añadido — Backend (`services/api`)
- **Modelo `User`** ampliado: `fullName`, `phone`, `provider` (`email|google`),
  relación `orders` (cliente) y `contactTickets`. Rol **`CUSTOMER`** (sin permisos
  de panel). Migraciones `20260902194713_nl13_profile_customer` y
  `20260902195405_contact_ticket_profile_fields`; seed actualizado (permisos
  `usuarios:ver`, `tickets:ver`, `tickets:gestionar`; ADMIN incluye usuarios/tickets).
- **StudioCliente (F-29):**
  - `POST /auth/register/customer` (público, auto-crea rol CUSTOMER, devuelve TokenPair).
  - `PATCH /auth/me` (perfil: nombres/telefono), `PATCH /auth/me/password` (204;
    rechaza cuentas Google sin contraseña), `PATCH /auth/me` amplía `me()` con
    `fullName/phone/provider`.
  - `POST /auth/me/google/link` y `/unlink`; `loginWithGoogle` auto-crea usuario
    CUSTOMER cuando el email no existe (placeholder de contraseña, provider `google`).
  - `GET /orders/mine` → `listByUser(userId)` para el historial del comprador.
  - `POST /orders` acepta `meta.userId` opcional a través del nuevo guard
    **`OptionalJwtAuthGuard`** (login no estrictamente requerido para comprar).
- **Soporte (F-31):** modelo **`ContactTicket`** (`name`, `email`, `phone?`,
  `subject`, `message`, `status` enum `new|in_progress|resolved|closed`,
  `adminNote?`, `userId?` onDelete SetNull).
  - Store/Admin contract: `POST /tickets` (guard opcional, asocia `userId` si hay
    sesión), `GET /api/tickets`, `PATCH /api/tickets/:id/status` (admin).
  - **Gestión de usuarios (F-30):** `GET /api/users`, `GET /api/users/:id`,
    `PATCH /api/users/:id` (`roleCodes?`, `isActive?`) — RBAC `usuarios:*`.
- **Correcciones de integración:** DATABASE_URL local `localhost`→`127.0.0.1`
  (fix de conexión Prisma/pg en Windows, IPv6 `::1`); modules auth/orders que usan
  guards JWT importan `PassportModule.register({ defaultStrategy: 'jwt' })`.

### Añadido — Store (`apps/store`)
- **AuthProvider + `useAuth()`** (`AuthContext`, `authClient.ts` con token en
  sessionStorage `noxlux.accessToken`, auto-sesión y limpieza en 401).
- **Tercera tab «CUENTA»** (`ProfileView`): visita→login/registro; logueado→datos,
  cambiar contraseña, **historial de pedidos** y "Contact Us". Contact Us sólo para
  usuarios logueados.
- **Checkout logueado:** autoprellena nombres/teléfono desde el perfil y envía el
  token (`Authorization: Bearer`) en `createOrder`; auto-registra `userId`.

### Añadido — Admin (`apps/admin`)
- **Panel de Usuarios** (`/usuarios`, reemplaza placeholder): lista usuarios con
  roles y activación/desactivación (`usuarios:ver` / `usuarios:gestionar`).
- **Panel de Tickets** (`/tickets`): lista mensajes de "Contact Us", vista de
  mensaje, cambio de estado `new→in_progress→resolved→closed` y nota admin
  (`tickets:ver` / `tickets:gestionar`).
- **Atajo «Nuevo producto»** en Inventario → `/productos/nuevo`.
- NAV_ITEMS ampliado (Usuarios, Tickets).

### Verificado
- **API:** 182 tests PASS (29 suites), cobertura 88.34/71.15/89.04/88.57
  (límites 80/70/80/80); lint oxlint limpio; flujos e2e por curl con BD real
  (register/login/me, tickets anónimo+logueado, orders/mine, users, PATCH status,
  updateProfile, changePassword).
- **Store:** build PASS (tsc -b + vite, 1608 modules); 22 tests PASS (4 files);
  lint sin errores.
- **Admin:** build PASS (tsc -b + vite); 53 tests PASS (9 files); lint limpio.
- **Versiones:** API 0.13.0 · Store 0.3.2 · Admin 0.1.2. TestSprite sigue
  deshabilitado (MCP `{}`, credenciales preservadas en `.testsprite-key`
  gitignored); infra Hetzner documentada, sin aprovisionar.

### Pendiente
- Despliegue real / aprovisionamiento Hetzner @ Ashburn (NL-13) y producción
  (NL-14). Pruebas e2e automatizadas en CUAA/CD (TestSprite) aún deshabilitadas.

## [0.12.1] — 2026-08-31 — NL-13: decisión de infraestructura (Staging, documentación)

**Decisión del PO aceptada (sin cambios de código).** Se fija el proveedor de
infraestructura para staging/producción y se actualiza la documentación de
despliegue. No se aprovisiona nada en este bloque.

### Añadido / Cambiado (documentación)
- **ADR-NL-007** → **ACEPTADO (NL-13)**: proveedor **Hetzner Cloud**, región
  **Ashburn (US East)** para la API + PostgreSQL **auto-gestionada** (decisión
  del PO). Instancia CX23 (2 vCPU / 4 GB / 40 GB NVMe) para staging.
- **ADR-NL-INFRA-001** → resuelto con el análisis comparativo Hetzner vs
  DigitalOcean para el mercado **Colombia/Latam**: Ashburn es óptima para Bogotá
  (~50–80 ms estimado); DO no tiene DC en Latam y su ventaja (Managed Database)
  no aplica con PG auto-gestionada; coste ~4–5× menor.
- **DEPLOYMENT_STRATEGY.md** v1.1: topología concreta de staging (STORE/ADMIN
  SPA tras Caddy/Cloudflare CDN, API Docker + TLS, PG auto-gestionada con
  `pg_dump`), presupuesto estimado staging (~€6–8/mes), nota de latencia Latam.
- **RELEASE_PLAN.md**: decisión de infra marcada aceptada; próximo bloque NL-14.
- **docs/adr/README.md**: índice actualizado (ADR-NL-007 / INFRA-001 ACEPTADOS).

### Verificado
- Cambios de **documentación únicamente**; sin cambios en `services/` ni versión
  de paquetes (API permanece 0.12.0). Aprobación de despliegue real pendiente
  del PO en NL-13/14.

## [0.12.0] — 2026-08-31 — NL-12: Testing & seguridad (hardening backend + auditoría + CSP + cobertura)

**Endurecimiento del backend (S-11/S-12/S-13) + auditoría central + CSP en apps
cliente + base de cobertura con umbrales.** Fallo rápido ante configuración
insegura (fail-fast con zod), rate limiting por IP, headers de seguridad
(helmet), filtro global de errores sin leaks, rotación/revocación de refresh
tokens con detección de replay, validación de media por magic bytes, PII enmascarada
en logs, paginación acotada y un módulo de auditoría legible por super-admin.

### Añadido
- **Config fail-fast** (`src/config/env.ts` + `env.spec.ts`): `validateEnv()` con
  zod exige secretos JWT (≥32 en prod y ≠ valores de ejemplo, y distintos entre
  sí), CORS sin `*` y `THROTTLE_*` con defaults (test→3600 / prod→global 300,
  login 5, refresh 10, orders 10, ttl 60s). El boot aborta ante config inválida.
- **`src/app.setup.ts`** (`configureApp`): `setGlobalPrefix`, CORS con allow-list,
  `helmet()`, `express.json({limit:'1mb'})`, `ValidationPipe` estricto
  (`forbidNonWhitelisted`), filtro global de errores y rate limiting por ruta
  (`/api/auth/login` 5/min, `/api/auth/refresh` 10/min, `POST /api/orders`
  10/min + global; `skip` para media-file/health/catalog).
- **`src/common/errors/http-exception.filter.ts`**: shape `{statusCode,message,error,path,timestamp}`,
  mapea P2002→409 / P2025→404, sin stack ni detalles internos de Prisma, y
  `message` string|array preservado.
- **`express-rate-limit` ^8.7.0** (sustituye a `@nestjs/throttler`, incompatible
  con Nest 12) + `helmet` ^8.3.0 (ADR-NL-020).
- **Refresh con rotación + replay** (`auth.service.ts`): reusar un token ya
  revocado revoca TODA la familia del usuario (`updateMany`) y devuelve 401;
  + `register` protegido con `usuarios:gestionar` (antes solo SUPER_ADMIN).
- **Media por magic bytes** (`media-storage.ts`): `mediaSignatureMatches()` para
  jpeg/png/webp/gif; `media.service.ts` valida mime + firma (rechaza SVG y
  contenido disfrazado → 400).
- **Auditoría central** (módulo `audit`, endpoint `GET /api/audit` con
  `auditoria:ver`): `AuditService.record()` best-effort (actor resuelto desde la
  BD, tx opcional, sin lanzar si falla la escritura) y `list()` con filtros
  action/entity/actor. Escrituras migradas en auth (login/logout/refresh/
  register/failed), inventory, media, orders (ip+userAgent) y products CRUD.
- **Paginación acotada** (`src/common/validation/pagination.ts`): `limitField`
  1..100 (default 50) aplicado a orders/products/inventory/media; catálogo
  público limitado a `PUBLIC_CATALOG_MAX=500`.
- **CSP en apps cliente**: plugin Vite (`apply:'build'`) que inyecta el meta CSP
  en `store` y `admin`; `repositoryFactory` del Admin fuerza backend real en
  PROD.
- **Test e2e de seguridad** (`test/security.e2e-spec.ts`, 15 casos): matriz RBAC
  (403/201), mass-assignment 400, token inválido 401, replay→familia revocada,
  429 login, headers helmet (nosniff/CSP), CORS (origen no listado), forma de
  errores sin stack, paginación (limit válido/9999/abc).
- **Base de cobertura**: `collectCoverageFrom` + `coverageThreshold`
  {statements 80, branches 70, functions 80, lines 80} y script
  `test:coverage`. Nuevos unit specs (filter, audit.service, zod pipe,
  pagination, jwt/google strategies, controllers auth/products/inventory/orders/
  media/audit, media-storage).

### Cambiado
- `auth.dto.ts`: schemas zod estrictos (`.strict()`) → rechazo de campos extra
  (mass-assignment) con 400.
- `jwt.strategy.ts`: sin fallback `dev-access-secret`; lanza si falta el secret.
- `auth.service.ts`: enumeración de Google con mensaje genérico.
- `seed.ts`: en prod exige `SEED_ADMIN_PASSWORD`; logs sin password por defecto.
- `fake-whatsapp.provider.ts`: teléfono enmascarado `573***567`, sin contenido.
- `orders.service.ts`: 404 sin UUID crudo.

### Verificado
- API unit **160/160** (25 suites; cobertura 93% stmts / 76% branches / 95%
  funcs / 94% lines) · API e2e **69/69** (7 suites, +15 security) · Store 22/22
  · Admin 53/53 · builds Nest + Store + Admin · lint · `npm audit` 0 pendientes.
- Backend **sin migración**: la tabla `AuditLog` ya existía (NL-08) y se usa
  `user.id` como `entityId` de los eventos de auth (decisión PO).

## [0.11.0] — 2026-08-31 — NL-11: Store consume API (repositorios REST; local → offline)

**El Store deja de ser local-first y pasa a subordinado del API (ADR-NL-003,
validado).** El catálogo se lee de `GET /api/products/catalog` (público, real):
cada variante aporta `id`, `stock` y `reserved` → la disponibilidad que ve el
comprador es **stock − reserved** (sin sobreventa por UI). El checkout crea el
pedido con `POST /api/orders` (anónimo) enviando solo `productVariantId +
quantity`; el **total lo fija el servidor** (S-06) y la respuesta trae el
`whatsappLink` del negocio (S-03): el Store lo usa tal cual, dejando el número
de WhatsApp del negocio fuera del cliente. `IndexedDB` pasa a **caché
last-known-good sin service worker**: si la red cae (`ApiError status 0`) se
sirve el último catálogo con aviso "MODO SIN CONEXIÓN" y el checkout ofrece
reintentar o confirmar manualmente con el resumen local. El port de productos
se recorta a **solo lectura** (`listActive`), el carrito milita
`productVariantId` (carts legados se descartan por migración Dexie v1→v2) y se
recupera la legibilidad de tipeo (`color-scheme: light` en Store/Admin).

### Añadido
- **Store — cliente HTTP anónimo** (`services/api/client.ts`): `request<T>`,
  `ApiError` con `status` (0 = red), `absoluteMediaUrl` para media
  (`/api/media/file/...` → URL absoluta sin proxy del Admin).
- **Store — repositorios REST**: `ApiProductRepository` (catálogo público),
  `ApiOrderRepository` (`POST /api/orders` con total + `whatsappLink` del
  servidor) y mappers REST→dominio (`api/mappers.ts`).
- **Caché offline**: `CachedProductRepository` (online-first → refresca caché →
  fallback `fromCache:true`), `LocalProductRepository` recortado a
  `listActive()`/`saveCatalog`, todo bajo el port `ProductRepository`
  (lectura-only) con ID simple.
- **Checkout UI**: modal con nombre + WhatsApp (8-20 dígitos), estados
  `form | submitting | success`, éxito con total del servidor y **ABRIR
  WHATSAPP** (usa el `whatsappLink` del servidor y **vacía el carrito** al
  abrir), 409 → banner "Stock insuficiente" + refresco de catálogo, 400 →
  mensaje de validación, red caída → reintento + fallback manual
  (`VITE_WHATSAPP_NUMBER`).
- **Disponibilidad por variante**: botones y carrito limitados a
  `stock − reserved` (AGOTADO / cap en cantidad).
- **Compartido**: `ProductVariant` gana `id`/`reserved`/`sku`/`status`
  (opcionales, del REST), `CartItem.productVariantId` (requerido) y
  `Order.whatsappLink?` (respuesta de POST /api/orders).
- **Env**: `apps/store/.env.example` (`VITE_API_URL`,
  `VITE_WHATSAPP_NUMBER`-fallback).

### Cambiado
- El Store ya no incrusta el número del negocio: el `wa.me` de los pedidos lo
  construye el **backend** (S-03); `generateWhatsAppMessage` queda solo como
  fallback offline.
- Port `ProductRepository` del Store: **solo lectura** (se eliminan
  `create`/`getAll`/`getById`/`toggleActive` y `createProduct` /
  `updateProduct` / `toggleProductStatus` del hook; el alta/baja vive en el
  Admin, NL-06).
- Dexie **v1→v2**: los carritos guardados sin `productVariantId` se descartan
  en la migración (no son pedibles).

### Verificado
- Store, tests 22/22 (+13: ApiProduct 3, CachedProduct 3, ApiOrder 4,
  LocalProduct caché 5, checkout UI 2) · API unit 89/89 · e2e 53/53 · Admin
  53/53 · builds · lint · `npm audit` 0 pendientes.
- Backend **sin migración ni cambios** (lo requerido ya existía: catálogo
  público con stock/reserved y `whatsappLink` en POST /api/orders).

## [0.10.0] — 2026-08-31 — NL-10: Pedidos y WhatsApp (vía API)

**Los pedidos dejan de confirmarse "en vivo" por chat.** El backend gana el
módulo de pedidos: `POST /api/orders` (anónimo, apuntando al checkout del
Store) persiste `Order`/`OrderItem`/`Customer` en PostgreSQL, calcula todos los
precios **en el servidor** (S-06) y **reserva stock** con regla de **no
sobreventa** (409). El estado del pedido (`pending→confirmed|cancelled` y
`confirmed→completed|cancelled`) se gestiona desde el Admin (`PATCH
/api/orders/:id/status`, permiso `pedidos:gestionar`) y **libera (`release`) o
consume** la reserva según el caso, todo trazado en el ledger `StockMovement`
(tipos `reserve`/`release` añadidos por migración) y en `AuditLog`. La
notificación por WhatsApp sale del **puerto `WhatsAppProvider`**: mensaje y
enlace `wa.me` construidos en el servidor con el número de negocio
`WHATSAPP_NUMBER` (el Store deja de incrustar el número — **S-03 mitiga**);
en NL-10 el envío usa `FakeWhatsAppProvider` (loguea `[FAKE]`), igual que el
driver de media: la integración real (Meta/Twilio) se activará en NL-13/14 bajo
el mismo contrato. El Admin estrena la página **Pedidos** en `/pedidos` (antes
placeholder "PRONTO") con listado por estado, detalle de items y acciones por
transición.

### Añadido
- **Módulo orders del backend** (`modules/orders`): `POST /api/orders` (anónimo;
  validación Zod estricta: `name`, `whatsappPhone` `^[0-9+]+$`, items `uuid` +
  `quantity 1..999`), `GET /api/orders` y `GET /api/orders/:id` (`pedidos:ver`),
  `PATCH /api/orders/:id/status` (`pedidos:gestionar`).
- **Reservas de stock**: al crear el pedido `reserved += qty` (movimiento
  `reserve`, `ref_type='order'`); si `qty > stockOnHand − reserved` → **409**.
  Cancelar libera (`reserved −= qty`); confirmar conserva; completar consume
  (`stockOnHand −= qty` y `reserved −= qty`). Todo en una transacción con
  `StockMovement` + `AuditLog` (`order.create|status`, actor opcional; el alta
  anónima guarda metadata ip/userAgent/source).
- **Precios server-side (S-06)**: `unitPrice = priceOverride ?? basePrice`,
  `lineTotal` y `totalAmount` calculados en el backend y devueltos en la
  respuesta; el cliente solo envía variante + cantidad.
- **WhatsApp**: puerto `WHATSAPP_PROVIDER` + `FakeWhatsAppProvider` (logger
  `[FAKE]`), `buildOrderWhatsAppMessage`/`buildWhatsAppLink` (número del negocio
  desde `WHATSAPP_NUMBER`, default `573000000000` en `.env.example`).
- **Permisos `pedidos:ver` / `pedidos:gestionar`** en el seed (idempotente;
  concedidos con `*` a SUPER_ADMIN).
- **Migración `nl10_order_movement_types`**: `StockMovementType` gana
  `reserve`/`release`.
- **Admin — Pedidos**: `OrderRepository` (port) + `ApiOrderRepository`
  (listar/filtrar por estado/detalle/`updateStatus`) + `LocalOrderRepository`
  (dev, no-op), factory `getOrderRepository()`, hook `useOrders` y
  `PedidosPage` (tabla, expandir items, botones por transición) en `/pedidos`;
  se retira el badge `PRONTO` de la navegación.
- **Compartido**: tipos `Order`, `OrderLineItem`, `OrderStatus` en
  `@nox-lux/shared` (+ re-export desde Admin).
- **Store (S-03)**: `App.tsx` lee `VITE_WHATSAPP_NUMBER` (default
  `573000000000`); el número ya no está hardcodeado.
- **Tests**: API unit 89 (+OrdersService 14, WhatsApp 4) · e2e 53 (+orders 16) ·
  Admin 53 (+ApiOrderRepository 6).

## [0.9.0] — 2026-08-30 — NL-09: Media (imágenes reales, galería multi-imagen + Admin)

**Las imágenes dejan de simularse.** El backend gana el módulo de media: subida
real de imágenes (local FS servido por la API en `/api/media/file/:key`),
listado y borrado, con whitelist de mimes (JPEG/PNG/WEBP/GIF) y límite
`UPLOAD_MAX_MB`. El producto admite **galería multi-imagen** (`ProductImage` ya
existía; ahora se gestiona con primaria y posición) y `DELETE
/products/:id/images/:imageId`. El Admin sustituye el simulador Unsplash por un
**ImageUploader** en alta/edición y estrena la página **Media** en `/media`
(antes placeholder "PRONTO"). Decisión: storage local servido por API para NL-09
(ADR-NL-015); el driver **S3-compatible se activará en NL-13/14** bajo el mismo
contrato `MediaStorage`, sin migración de esquema (tabla `ProductImage` ya
existía; no hace falta schema migration).

### Añadido
- **Módulo media del backend** (`modules/media`, puerto `MEDIA_STORAGE` +
  `LocalMediaStorageProvider`): `POST /api/media/upload` (multipart, mime
  whitelist + `UPLOAD_MAX_MB`, audita `media.upload`), `GET /api/media`
  (galería de la biblioteca con producto referenciado), `GET /api/media/file/:key`
  (**público**, `nosniff`, content-type del mime, anti path-traversal vía
  `basename`) y `DELETE /api/media/:key` (`media:eliminar`; **409** si está en
  uso por un producto).
- **Permisos `media:ver` / `media:subir` / `media:eliminar`** en el seed
  (idempotente; preferencias `*` para SUPER_ADMIN).
- **Products multi-imagen**: `productImageInputSchema`, `images[]` en create y
  update (reemplazo de galería con borrado de blobs locales huérfanos vía
  `MediaService.removeByUrl`), `imageUrl` legacy → primaria, y
  `DELETE /api/products/:id/images/:imageId` (`productos:editar`).
- **`@types/multer`** + `tsconfig` types (`node`, `jest`, `multer`) para
  `Express.Multer.File`; el runtime de multer ya viene con
  `@nestjs/platform-express`.
- **Admin — Media real**: `MediaRepository` (port) + `ApiMediaRepository`
  (FormData sin Content-Type json) + `LocalMediaRepository` (object URLs dev),
  factory `getMediaRepository()`, `MediaPage` (subir/listar/borrar con
  confirmación) en `/media` (se retira el badge `PRONTO`), y `ImageUploader`
  (galería con primaria) integrado en `NewProductPage`/`EditProductModal`.
- **Compartido**: tipo `ProductImage` en `@nox-lux/shared` y `Product.images?`
  (mappers del Admin: `images[]` en el DTO, `fromApiProduct` restaura galería).
- **Tests**: API unit 71 (MediaService 12, LocalMediaStorageProvider 5,
  ProductsService +5 con imágenes/removeImage) + e2e 37 (`media.e2e-spec` 11 y
  productos con `images[]`/borrado de imagen); Admin 47
  (`ApiMediaRepository` 5, mappers con imágenes).

## [0.8.0] — 2026-08-30 — NL-08: Inventario y stock (movimientos + auditoría + Admin)

**El stock deja de ser solo-lectura.** El backend gana el módulo de inventario:
lectura por variante y dos escrituras (`set` absoluto y `adjust` ±), protegidas
con el permiso `inventario:editar` y con regla de **no sobreventa** (stock
negativo → 409). Cada cambio queda **trazado** en el nuevo ledger `StockMovement`
y en `AuditLog` (SECURITY_MODEL: "cambios de stock" auditables). El Admin añade
el panel de **Inventario** (sustituye el placeholder "PRONTO") y el formulario de
producto ya envía el `stock` por variante (inventario inicial en el alta). Las
**reservas** (`reserved`) quedan diferidas a NL-10 (pedidos), decisión confirmada
por el PO.

### Añadido
- **Módulo inventory del backend** (`modules/inventory`): `GET /api/inventory`
  (todas las variantes con stock/reservado/disponible),
  `GET /api/inventory/:variantId`, `PUT /api/inventory/:variantId` (set absoluto
  ≥ 0) y `POST /api/inventory/:variantId/adjust` (delta ≠ 0). Guard JWT +
  `inventario:ver` (lectura) / `inventario:editar` (escritura).
- **Tabla `StockMovement`** (migración `nl08_stock_movements`): ledger por
  variante con `type` (`initial|set|adjust`), `delta`, `stock_before/after`,
  `reason` y `ref_type/ref_id` (reserva para referencias futuras, p. ej. pedidos).
- **Escritura transaccional**: cada cambio updatea/crea `Inventory` + inserta
  `StockMovement` + `AuditLog` (`inventory.set|adjust`, actor opcional) en la
  misma transacción.
- **Stock en el CRUD de productos**: `variantInputSchema` acepta `stock`; el
  `create` y el reemplazo de variantes del `update` crean el inventario inicial y
  registran movimiento `initial` (el `update` pasa de `createMany` a `create`
  individual para poder crear el inventario anidado).
- **Admin — Inventario**: `InventoryRepository` (port) + `ApiInventoryRepository`
  + `LocalInventoryRepository` (dev, solo lectura/no-op), factory
  `getInventoryRepository()` por `VITE_AUTH_MODE`, hook `useInventory` y
  `InventarioPage` (tabla de variantes, disponible = stock − reservado, modal de
  ajuste con motivo y modo set/adjust) en `/inventario`; se retira el badge
  `PRONTO` de la navegación.
- **Admin — stock en producto**: `mappers.ts` envía `stock` por variante en
  crear/editar (antes se descartaba).
- **Permiso `inventario:ver`** añadido al seed (seed idempotente; se concede a
  SUPER_ADMIN y ADMIN junto con `inventario:editar`).
- **Tests**: API unit 49 (ProductsService 15 con stock, InventoryService 8) +
  e2e 25 (`inventory.e2e-spec` 9: auth, set/adjust, 400/404/409);
  Admin 39 (`ApiInventoryRepository` 6; mappers con stock).

### Cambiado
- `ProductsService.update`: reemplazo de variantes por `create` individual
  (habilita inventario inicial por variante; cascada sigue igual).
- `FUNCTIONALITY_MATRIX`: F-25/F-26 (inventario y stock en producto) marcadas
  REAL; `SECURITY_AUDIT`: S-06 (stock) mitigado en NL-08.

### Diferido / decisión PO
- **Reservas** (`reserved`) y reglas de estados de pedido → **NL-10** (se
  expone `reserved` de lectura; `available = on_hand − reserved`).
- El bloqueo del roadmap pasa a **NL-09 — Media (Object Storage, imágenes)**.

### Verificado
- **API live contra PostgreSQL 18**: migración aplicada, seed con `inventario:ver`
  aplicado, `GET /api/inventory` (11 variantes), `PUT` set 200 con movimiento +
  auditoría, `adjust` ± 200, 409 negativo, 400 (stock negativo / delta 0), 404
  variante, 401 sin token; alta/edición de producto con stock y movimiento
  `initial`; catálogo en 6.
- **API unit 49/49** (6 suites) ✅ · **API e2e 25/25** (4 suites) ✅ ·
  **Admin 39/39** (7 suites) ✅ · Store 9/9 (sin tocar) ✅ ·
  build Admin + Store + API ✅ · lint Admin + Store + API ✅ ·
  `npm audit` **0 vulnerabilidades** ✅.

## [0.7.0] — 2026-08-30 — NL-07: CRUD REST del catálogo + Admin sobre la API + PostgreSQL 18 en vivo

**La fuente de verdad deja de ser la IndexedDB compartida y pasa a PostgreSQL vía
REST (ADR-NL-003 VALIDADO).** El backend expone el CRUD completo de
productos/variantes con RBAC; el Admin se migra a la API (su `ProductRepository`
cambia de implementación real según `VITE_AUTH_MODE=api`) y el borrado físico
queda con el nuevo permiso `productos:eliminar`. El Store no se toca (sigue en
IndexedDB hasta NL-11).

### Añadido
- **Módulo products del backend** (`modules/products`): CRUD REST completo —
  `GET /api/products` (admin, con filtros `category`/`search`), `GET /api/products/:id`,
  `POST /api/products`, `PATCH /api/products/:id` (reemplazo total de variantes),
  `POST /api/products/:id/toggle` (alta/baja lógica) y `DELETE /api/products/:id`
  (borrado físico en cascada de variantes e imágenes). Responde con stock/reserved
  como solo-lectura (inventario real llega en NL-08).
- **Catálogo público** `GET /api/products/catalog` (solo `isActive=true`) para el
  consumo del Store (NL-11).
- **RBAC aplicado**: `productos:ver|crear|editar|eliminar`; `PermissionsGuard`
  ahora concede cualquier permiso al código comodín `'*'` (SUPER_ADMIN).
- **Validación Zod → 400**: el `ZodValidationPipe` devuelve `BadRequestException`
  con los issues formateados (antes propagaba un 500 genérico).
- **Seed extendido**: permiso `productos:eliminar` + admin bootstrap
  `admin@noxlux.test` (hash Argon2id, supera `SEED_ADMIN_PASSWORD`,
  SUPER_ADMIN). Seed adaptado a Prisma 7 (adapter `PrismaPg`, `dotenv/config`)
  y corregido el alta de imagen primaria (`@db.Uuid`).
- **PostgreSQL 18 nativo en local**: BD `nox_lux` (rol `nox_lux`), migraciones
  `0_init` + `nl05_refresh_token` aplicadas, seed aplicado, API corriendo y
  verificada en vivo contra la BD real.
- **Admin sobre la API**: cliente HTTP común (`services/api/client.ts`:
  `request` + `authedRequest` con Bearer desde tokenStorage y errores
  `ApiError`), repositorio `ApiProductRepository` + `mappers.ts`
  (dominio `Product` ↔ DTO del API; el stock no se envía, es solo-lectura) y
  factory `getProductRepository()` que elige API (`VITE_AUTH_MODE=api`) o
  IndexedDB (dev). `.env` del Admin en `api`.
- **Tests**: Productos unit 12 (`ProductsService`) + e2e 9 (`products.e2e-spec`,
  CRUD, 401/403, 400, 404) en el API; `ApiProductRepository`+`mappers` 10 en el
  Admin; extraído `@prisma/client` mock con `Prisma.PrismaClientKnownRequestError`.

### Cambiado
- `ZodValidationPipe`: de 500 a 400 con detalle de path/message/code.
- `ApiAuthRepository` refactorizado para reutilizar el client HTTP (misma API,
  re-exporta `ApiError`; `me(accessToken)` intacto).
- El listado admin incluye productos inactivos; el catálogo público no.

### Verificado
- **API live contra PostgreSQL 18**: login + `/me` con roles/permisos, catálogo
  público (6), CRUD completo con materiales válidos (201/200/200/200/404),
  401 sin token, 400 en validación, 403 sin permiso, 404 al eliminar.
- **API unit 38/38** (5 suites) ✅ · **API e2e 16/16** (3 suites) ✅ ·
  **Admin 33/33** (6 suites) ✅ · Store 9/9 (sin tocar) ✅ ·
  build Admin + Store + API ✅ · lint Admin + API ✅ ·
  `npm audit` **0 vulnerabilidades** ✅.

## [0.6.0] — 2026-08-29 — NL-06: Admin Panel independiente (react-router + sesión JWT)

**Separación Store / Admin completada (ADR-NL-002 y ADR-NL-006 VALIDADOS).** El
Store deja de ser una app con doble rol: la gestión administrativa vive ahora en
un panel externo, privado y con autenticación real contra la NOX & LUX API
(NL-05). El catálogo sigue siendo compartido vía IndexedDB `nox-lux-db` hasta
que el CRUD viaje por REST (NL-07).

### Añadido
- **`apps/admin` (`@nox-lux/admin`)** — App independiente React 19 + Vite 7 +
  Tailwind 4 + **react-router v7** (decisión NL-06), puerto dev **5174**
  (el Store usa 5173). Scripts raíz: `dev:admin`, `build:admin`, `test:admin`.
- **Sesión del Admin** (`src/auth/`): port `AuthRepository` + dos impls —
  `ApiAuthRepository` (consumo real de `POST /api/auth/login|refresh|logout` y
  `GET /api/auth/me` con Bearer) y `DevAuthRepository` (**solo desarrollo**,
  activado con `VITE_AUTH_MODE=dev` o cuando el API no responde; no valida
  credenciales, nunca en producción). `AuthProvider` + `useAuth`.
- **Tokens (decisión NL-06)**: access token **solo en memoria**; refresh token en
  `sessionStorage`; auto-restauración de sesión al arrancar (`refresh` con
  rotación) y logout con revocación (SECURITY_MODEL §2).
- **Módulo Productos** (`src/features/products/`): repo local sobre la MISMA
  IndexedDB `nox-lux-db` que el Store (ADR-NL-002/012, demo "crear en Admin →
  ver en Store"), hook `useProducts` y vistas listado / crear / editar con alta y
  baja de catálogo. Placeholders para Inventario/Pedidos/Clientes/Media/Usuarios
  (NL-08..NL-10).
- **API**: `app.enableCors` con `CORS_ORIGINS` (default 5173+5174) en
  `main.ts`; `GET /api/auth/me` ahora devuelve `{ id, email, roles,
  permissions }` (antes solo email) para que el Admin resuelva RBAC en el cliente.
- **Tests Admin** (Vitest): `ApiAuthRepository` (8),
  `DevAuthRepository` (5), `LocalProductRepository` (5), `AuthProvider` (3) y
  smoke del App (2) = **23 tests**.

### Cambiado / eliminado
- **Store limpio de admin**: eliminados el selector de rol (seguridad S-01
  cerrada), las pestañas `admin_products`/`admin_add`, el formulario y el modal
  de edición y los handlers administrativos. `App.tsx` queda solo con las vistas
  de comprador (catálogo + carrito); `Tab` pasa a ser solo
  `'catalog' | 'cart'`.

### Verificado
- build Admin ✅ · build Store ✅ (inmaculado tras la extracción) ·
  `tsc -b` monorepo ✅ · lint limpio ✅ · **Store 9/9** ✅ · **Admin 23/23** ✅ ·
  **API unit 26/26** (me con RBAC sumó 2) ✅ · **API e2e 7/7** ✅ ·
  `npm audit` **0 vulnerabilidades** ✅.
- Nota: durante el desarrollo con dos puertos (5173/5174, orígenes distintos)
  cada app usa su propia copia de IndexedDB; al desplegar sobre un mismo origen,
  o al migrar el CRUD a REST (NL-07), el catálogo queda compartido de verdad.

## [0.5.0] — 2026-08-28 — NL-05: Autenticación y acceso admin (RBAC + JWT)

**Auth real del backend** (ADR-NL-018). Modelo dual decisión del PO:
**Google OAuth + contraseña** (Argon2id). Google solo autentica **identidad**
(email); los **roles provienen siempre de la BD** y el **administrador** crea
los usuarios (no hay auto-registro, ni auto-creación por Google). Sesiones:
access JWT corto + refresh token con **rotación y revocación** en BD
(SECURITY_AUDIT S-01/S-02 mitigadas).

### Añadido
- **`AuthModule`** en `src/modules/auth/`: `AuthService` (register admin-only,
  login con Argon2id, `loginWithGoogle`, refresh con rotación, logout con
  revocación, me), `AuthController` (`POST /api/auth/register|login|refresh|logout`,
  `GET /api/auth/me`, `GET /api/auth/google` + `/google/callback`), `JwtStrategy`
  (passport-jwt, hidrata roles/permisos por request) y `GoogleStrategy`
  (passport-google-oauth20, registrado solo con `GOOGLE_*` configurados).
- **`AuthorizationModule`**: guards `RolesGuard` (`@Roles(...)`) y
  `PermissionsGuard` (`@Permissions(...)`) que leen `request.user` poblado por
  JWT; decoradores `@CurrentUser()`, `@Roles()`, `@Permissions()`.
- **Tabla `RefreshToken`** en `prisma/schema.prisma` (tokenHash único SHA-256,
  expiresAt, revokedAt, FK cascade a User) + **migración versionada**
  `prisma/migrations/nl05_refresh_token/migration.sql` (estilo Prisma; generada
  manualmente porque `migrate diff --from-migrations` requiere shadow DB).
  `prisma validate` ✅ · `prisma generate` ✅.
- **Config env** (`.env.example` + `.env` local): `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL=900`, `JWT_REFRESH_TTL=604800`
  (secretos reales generados en `.env`, nunca versionados) y placeholders
  `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` (el PO añadirá las credenciales reales).
- **Tests**: unit `AuthService` (11) + guards (8) con mocks de Prisma/Argon2/JWT;
  e2e `auth.e2e-spec.ts` (6: login→me→refresh→rotación→revocación, con
  `overrideProvider(PrismaService)`). Fix de DI: `@swc/jest` con
  `legacyDecorator` + `decoratorMetadata` para emitir `design:paramtypes`.
  Stub de `@prisma/client` ampliado con el enum `RoleCode`.

### Verificado
- build API ✅ · `tsc --noEmit` ✅ · **unit 24/24** (4 suites) ✅ ·
  **e2e 7/7** (auth 6 + health 1) ✅ · lint limpio ✅ · `npm audit`
  **0 vulnerabilidades** ✅ · seed typecheck ✅ · build Store intacto ✅.
- **Google real / BD real sin validar en local** (sin credenciales ni servidor
  PostgreSQL): flujo verificado con mocks + env placeholders. Pendiente: añadir
  credenciales reales en `.env`, autorizar `GOOGLE_CALLBACK_URL`, aplicar
  `prisma migrate` + `seed` y probar OAuth contra Google.

## [0.4.0] — 2026-08-28 — NL-04: Base de datos / modelo (PostgreSQL)

**Modelo de datos del backend.** Implementa en PostgreSQL (ADR-NL-005) las
12 entidades canónicas del `DATA_MODEL.md`. Sin CRUD aún (NL-07+).

### Añadido
- **`prisma/schema.prisma`** con el modelo canónico completo: RBAC
  (User/Role/Permission/UserRole/RolePermission), catálogo
  (Product/ProductVariant/ProductImage), Inventory, Customer/Order/OrderItem y
  AuditLog. Enums (`Material`, `Category`, `VariantStatus`, `OrderStatus`,
  `RoleCode`), montos `Decimal(12,2)`, timestamps `timestamptz`, índices en FK.
  `prisma validate` ✅ · `prisma generate` ✅.
- **Migración inicial versionada** `prisma/migrations/0_init/migration.sql`
  (generada con `migrate diff`, lista para aplicar cuando exista la BD).
- **`PrismaModule` + `PrismaService`** (global) en `src/modules/prisma/`, con
  `@prisma/adapter-pg` + `pg`; connect/disconnect en ciclo de vida NestJS.
  Registrado en `AppModule`.
- **`docker-compose.yml`** (postgres:16-alpine, BD `nox_lux`) para desarrollo
  reproductible. `.env.example` y `.env` apuntan a la BD local.
- **Seed** (`prisma/seed.ts`, idempotente con `upsert`): catálogo de demo
  (Product→Variants→Inventory→Images, mapeado de INITIAL_PRODUCTS) y roles/
  permisos base de RBAC (SECURITY_MODEL: SUPER_ADMIN + ADMIN). Usuarios → NL-05.
- **Tests unit del PrismaService** (3) con stubs de `@prisma/client` y
  `@prisma/adapter-pg` (moduleNameMapper). Total unit: 2 suites / 5 tests.
- Scripts npm: `prisma:migrate`, `prisma:migrate:prod`, `prisma:seed`,
  `prisma:studio` + `"prisma.seed"` config.

### Verificado
- `prisma validate` ✅ · `prisma generate` ✅ · build API ✅ · **unit 5/5** ✅ ·
  **e2e 1/1** (AppModule con PrismaModule arranca, /api/health → 200) ✅ ·
  lint global limpio ✅ · `npm audit` **0 vulnerabilidades** ✅.
- BD real no disponible en local (sin Docker/PostgreSQL) → migración y seed
  **generados y versionados**, pendientes de aplicar cuando haya servidor
  (decisión aprobada: mock para tests, no bloquear el bloque).

## [0.3.1] — 2026-08-28 — NL-03: Backend foundation (NestJS + Prisma + Argon2id)

**Primer backend.** Crea `services/api` (@nox-lux/api) como Modular Monolith
(ADR-NL-004). Sin modelos de BD aún (NL-04). Valida ADR-NL-001/004 y define la
base de Prisma 7 (ADR-NL-005).

### Añadido
- **API NestJS 12** en `services/api`: `main.ts` (bootstrap, prefijo `/api`,
  ValidationPipe), `app.module.ts` (módulo raíz).
- **Modular Monolith** (SYSTEM_BOUNDARIES.md, ADR-NL-004): módulos `auth`,
  `authorization`, `products`, `inventory`, `orders`, `customers`, `media`,
  `audit` (scaffolds) + `health` (endpoint verificable).
- **`Argon2Service`** (Argon2id) vía `@node-rs/argon2` (binarios precompilados,
  sin compilación nativa) en `common/crypto`. Módulo `CryptoModule`.
- **`ZodValidationPipe`** (stack REST + Zod aprobado) en `common/validation`.
- **Prisma 7** configurado: `prisma/schema.prisma` (PostgreSQL, sin `url` en
  schema — Prisma 7 la mueve a `prisma.config.ts`) y `prisma.config.ts`.
  `prisma validate` ✅, `prisma generate` ✅ (cliente a `node_modules/@prisma/client`).
- **Tests**: `argon2.service.spec.ts` (unit, 2) y `health.e2e-spec.ts` (e2e, 1).
- **jest con `@swc/jest`** (monorepo con root sin `type: module`), stub de
  `@node-rs/argon2` vía `moduleNameMapper`.
- `services/api/.env.example` (DATABASE_URL, API_PORT) y `.env` local (gitignored).

### Cambiado
- Root `package.json`: **eliminado `"type": "module"`** (Store y API ya declaran
  su propio tipo por workspace) para resolver el conflicto CJS/ESM de jest.
- Root `package.json`: script `test:api` y `dev:api`.
- `services/api/package.json`: de stub a proyecto NestJS completo.

### Corregido / decisiones técnicas (documentadas)
- **Vulnerabilidad audit (high)**: Prisma 7 traía `deepmerge-ts@7.1.5` (stack
  exhaustion). Se fija `deepmerge-ts@8` vía **override anidado** en
  `@prisma/config`. Resultado: **0 vulnerabilidades**.
- **`@node-rs/argon2`** (binario nativo) sustituye a `argon2` (evita compilar
  nativo en Windows). Implementa el mismo algoritmo Argon2id aprobado.
- **`@nox-lux/shared`** es TS-source (para Vite); el backend no lo importa aún
  en runtime (CJS no ejecuta TS). Documentado para NL-07+.

### Verificado
- `prisma validate` ✅ · `prisma generate` ✅ · build API ✅ · unit 2/2 ✅ ·
  e2e 1/1 ✅ · **arranque real: HTTP 200 en `/api/health`** (módulos OK, Argon2id
  nativo cargado) · `npm audit` **0 vulnerabilidades** · build Store intacto ✅.

## [0.3.0] — 2026-08-28 — NL-01 + NL-02: Monorepo + estructura repo

**Conversión a monorepo** (decisión PO: Opción A). Versión raíz pasa a `0.3.0`.

### Añadido
- **Root `package.json`** con `workspaces` npm (`apps/*`, `services/*`,
  `packages/*`) y scripts de orquestación (`dev:store`, `build:store`, `test`,
  `test:store`, `lint`).
- **`packages/shared` (`@nox-lux/shared`)**: paquete de tipos de dominio compartidos
  (Material, Category, Role, Product, ProductVariant, CartItem) consumido
  directamente como fuente TypeScript (sin paso de build).
- **`tsconfig.base.json`** (raíz): opciones de compilación comunes + path mapping
  `@nox-lux/shared`.
- **Stubs de workspaces**: `apps/admin` (`@nox-lux/admin`, NL-06) y
  `services/api` (`@nox-lux/api`, NL-03).

### Cambiado (movido a `apps/store`, `@nox-lux/store`)
- La app Store (src, index.html, public, vite.config.ts, tsconfigs) migrada de la
  raíz a `apps/store/`.
- `src/types/index.ts` re-exporta los tipos de dominio desde `@nox-lux/shared`
  (fuente única de verdad) y conserva los tipos de UI del Store (CustomerTab,
  AdminTab, Tab).
- Los tsconfigs del Store extienden `tsconfig.base.json`.
- `node_modules` y `package-lock.json` regenerados desde la raíz (hoisted).

### Comprobado
- `npm run build:store` ✅ · `npm run test` ✅ **9/9** · `npm run lint` ✅.
- Preview del Store: HTTP 200.
- `dependencies` en workspaces usan `"@nox-lux/shared": "*"` (npm no soporta
  `workspace:*`, a diferencia de pnpm/yarn).

### Notas
- ADR de monorepo y paquete compartido se reflejan en
  `ARCHITECTURE_BLUEPRINT_V1.md` y `SYSTEM_BOUNDARIES.md`.
- `nox_lux_mobile_application.tsx` (referencia histórica) permanece en la raíz;
  ya no se lint-ea.

## [0.2.1] — 2026-08-28 — NL-00: Redirección & Architectural Discovery (docs)

**Sin cambios de código.** Documentación y decisiones de arquitectura.

### Añadido
- **`ARCHITECTURE_BLUEPRINT_V1.md`**: arquitectura de 3 sistemas (STORE / ADMIN /
  BACKEND) con backend como fuente de verdad.
- **`SYSTEM_BOUNDARIES.md`**: límites entre sistemas y módulos del backend.
- **`SECURITY_MODEL.md`**: Argon2id + JWT + RBAC + auditoría.
- **`DEPLOYMENT_STRATEGY.md`**: despliegue por entorno (proveedor pendiente).
- **`MIGRATION_STRATEGY.md`**: reclasificación del MVP + roadmap NL-01..14.
- **Nuevos ADR (dirección):** ADR-NL-001 (backend propio), 002 (separación
  Store/Admin), 003 (fuente central de verdad), 004 (Modular Monolith), 005
  (PostgreSQL), 006 (admin independiente), 007 (infra, PENDIENTE) e
  `ADR-NL-INFRA-001` (PENDIENTE).
- **`docs/adr/README.md`**: índice y mapa de renumeración.

### Cambiado
- **ADR históricos renumerados** `ADR-NL-001..006` → `ADR-NL-011..016` para
  reservar `ADR-NL-001..007` a la nueva directiva.
- Actualizados: `ARCHITECTURE.md`, `DATA_MODEL.md` (modelo PostgreSQL objetivo),
  `FUNCTIONALITY_MATRIX.md` (nuevas columnas de destino arquitectónico),
  `PROJECT_OVERVIEW.md`, `PROJECT_STATUS.md`, `README.md`.
- Nota de redirección añadida a: `CURRENT_ARCHITECTURE`, `PROJECT_INVENTORY`,
  `DEPENDENCY_AUDIT`, `INITIAL_RISKS`, `MVP_AUDIT`, `SECURITY_AUDIT`,
  `TECHNICAL_DEBT`, `TEST_REPORT`, `RELEASE_PLAN`.

### Decisiones confirmadas (Product Owner)
- Monorepo (Opción A). Persistencia local → fallback/desarrollo. Stack backend
  candidato aprobado (NestJS/Prisma/Argon2id). Admin externo.

### Pendiente (bloquea NL-13/14 y algunas reglas)
- Proveedor de infraestructura (ADR-NL-007 / INFRA-001). Reglas de inventario y
  pedidos. Políticas de seguridad concretas.

## [0.2.0] — 2026-08-28 — NL-02: Persistencia local

### Añadido
- Base de datos local **IndexedDB vía Dexie** (`src/services/storage/db.ts`).
- **Ports de repositorio** (`ProductRepository`, `CartRepository`) en
  `src/services/repositories/types.ts`.
- Implementaciones locales: `LocalProductRepository`, `LocalCartRepository`.
- Fábrica de repositorios (inyección de dependencia) en
  `src/services/repositories/index.ts`.
- Hook **`usePersistentStore`** que carga y persiste productos + carrito.
- Estados de **carga** y **error** en la UI.
- Tests de repositorios con `fake-indexeddb` (8 tests).
- Documentación: `DATA_MODEL.md`, `STATE_MANAGEMENT.md`, `ARCHITECTURE.md`.

### Cambiado
- `src/app/App.tsx`: los datos ahora fluyen por el hook/repositorio; la UI se
  preserva. La BD **inicia vacía** (decisión del PO).
- `src/test/setup.ts`: importa `fake-indexeddb/auto`.
- `src/test/App.smoke.test.tsx`: refleja el inicio vacío.

### Resuelto
- `NL-ISSUE-001` (datos en memoria) → persistencia local (IndexedDB).

### Notas
- `ADR-NL-012` (antiguo 002) → IMPLEMENTADO. `ADR-NL-013` (antiguo 003) → APROBADO.

## [0.1.0] — 2026-08-28 — NL-01: Scaffold del proyecto

### Añadido
- Proyecto Vite + React 19 + TypeScript 6 + Tailwind CSS 4 ejecutable.
- `@vitejs/plugin-react` v5 y Vite v7 (fijados por compatibilidad con Vitest 3).
- Vitest 3 + Testing Library (jsdom) con `src/test/setup.ts`.
- Estructura base objetivo: `src/app`, `src/features`, `src/components/{ui,shared}`,
  `src/constants`, `src/types`, `src/services`, `src/hooks`, `src/lib`, `src/utils`,
  `src/test`.
- Tipos base del dominio en `src/types/index.ts`.
- Constantes de negocio y catálogo de demostración en `src/constants/index.ts`.
- Utilidades CSS (`scrollbar-none`, `animate-fade-in`) en `src/index.css`.
- `.env.example` con `VITE_WHATSAPP_NUMBER` y `VITE_APP_ENV`.
- Documentación de Fases 1 y 2 (`docs/01-discovery`, `docs/02-audit`,
  `docs/00-project`), ADR-NL-001 a 006, `PROJECT_STATUS.md`, `TEST_REPORT.md`,
  `RELEASE_PLAN.md`.
- Smoke test del render del catálogo (`src/test/App.smoke.test.tsx`).

### Movido
- El MVP migrado de `nox_lux_mobile_application.tsx` a `src/app/App.tsx`, con
  imports desde `types`/`constants` y tipado inicial. **Sin cambio de
  comportamiento funcional.**

### Notas
- El archivo original `nox_lux_mobile_application.tsx` se conserva como
  referencia histórica del MVP.
- `nox_lux_mobile_application.tsx` (referencia) presenta warnings de `no-unused-vars`
  de oxlint; el código activo en `src/` está limpio.