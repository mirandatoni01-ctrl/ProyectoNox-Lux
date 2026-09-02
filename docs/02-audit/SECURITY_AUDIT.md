# SECURITY AUDIT — NOX & LUX

**Fase:** 02 — Auditoría
**Bloque:** NL-00

## Hallazgos

| ID | Hallazgo | Severidad | Bloque |
|---|---|---|---|
| S-01 | Cambio de rol por botón (autorización falsa) | **CRÍTICA** | NL-03 · **MITIGADA NL-05** · **CERRADA NL-06** |
| S-02 | Sin autenticación para operaciones admin | **CRÍTICA** | NL-03 · **MITIGADA NL-05** |
| S-03 | Número WhatsApp hardcodeado en cliente | Alta | NL-01/NL-07 · **MITIGADA NL-10** |
| S-04 | Sin variables de entorno (secretos en código) | Alta | NL-01 |
| S-05 | Sin validación de entrada en el servidor (no hay backend) | Alta (futuro) | NL-02+ |
| S-06 | Precios/stock confiados al cliente (sin fuente de verdad) | Alta (futuro) | NL-02+ · stock **MITIGADO NL-08** · precios **MITIGADO NL-10** |
| S-07 | Sin validación de formulario robusta (NL-019/022) | Media | NL-05 |
| S-08 | Modales sin foco/trampa de foco (accesibilidad/seguridad de UI) | Baja | NL-04 |

## Política aplicada

- **Nunca** un rol del frontend se considera autorización.
- **Nunca** secretos en el código; uso de variables de entorno (`.env`, no commiteado).
- La fuente de verdad de autorización/precios/stock estará en el sistema de datos
  (backend futuro); el cliente solo es presentación.

## Acciones ya realizadas

- `.env.example` creado; `.env*` añadido a `.gitignore`.
- Número WhatsApp movido conceptualmente a entorno (pendiente completar valor real).
- Botón de cambio de rol: **temporal** (demo). Se reemplaza por auth real en NL-03
  antes de cualquier exposición a producción.

> **NL-00 (redirección):** El modelo de seguridad objetivo se detalla en
> `SECURITY_MODEL.md` (Argon2id + JWT + RBAC + auditoría). Los bloques de la tabla
> original (NL-03 auth) pasan a NL-05 (auth/acceso admin) del roadmap NL-01..14.

> **NL-05:** S-01 y S-02 **mitigadas**: el backend ya aplica autorización real.
> - `POST /api/auth/register` está protegido por JWT + `@Roles(SUPER_ADMIN)`
>   (el usuario lo crea un admin; no existe auto-registro ni auto-creación por Google).
> - `Tokens con rotación`: access JWT corto + refresh revocable en BD (`RefreshToken`).
> - Guard de JWT hidrata roles/permisos desde la BD por request; defecto seguro
>   (sin token → 401; sin rol → 403).
> - Recuerda: el botón de rol del Store sigue en modo demo hasta NL-06; mientras
>   tanto no se expone a producción.

> **NL-06:** **S-01 CERRADA**: el selector de rol y el panel admin integrado del
> Store fueron **eliminados**; la operación administrativa vive solo en
> `apps/admin` (PA externo con login real contra la API). S-02 permanece
> **mitigada**, ahora reforzada por el Admin:
> - Access token **solo en memoria**; refresh token en `sessionStorage` con
>   rotación/revocación (ADR-NL-006).
> - `DevAuthRepository` es un fallback **solo-desarrollo** (`VITE_AUTH_MODE=dev`);
>   está **prohibido en producción** (el build de staging/prod debe usar `api`).
> - CORS restringido por `CORS_ORIGINS` (default 5173/5174).
> - `GET /api/auth/me` expone roles/permisos para RBAC en el cliente; la
>   autorización real de cada operación seguirá cayendo en el backend (NL-07+).

> **NL-07:** **S-02 reforzada** y autorización aplicada al CRUD real:
> - Cada endpoint admin exige JWT + permiso exacto (`productos:ver|crear|editar|
>   eliminar`); `PermissionsGuard` concede el comodín `'*'` solo a SUPER_ADMIN.
> - Validación servidor con Zod → **400** (`ZodValidationPipe` formado); slug
>   duplicado → 409; borrado inexistente → 404. La entrada no se confía al cliente.
> - Catálogo público **solo lectura** (`GET /api/products/catalog`, `isActive=true`);
>   escritura nunca expuesta sin token.
> - El Admin autentica contra la API real (`VITE_AUTH_MODE=api`) y adjunta el Bearer
>   desde `tokenStorage` (memoria); bloques futuros: auto-refresh/401 → NL-12.
> - Borrado físico requiere `productos:eliminar` (mitiga borrados accidentales).

> **NL-08:** **S-06 (stock confiado al cliente) reforzada** —
> - Cambios de stock en el backend, nunca en el cliente: `PUT /api/inventory/:id`
>   (valor absoluto ≥ 0) y `POST /api/inventory/:id/adjust` (delta ≠ 0), ambos
>   con `inventario:editar`; lectura con `inventario:ver` (permiso nuevo, seed).
> - **No sobreventa**: ajustar por debajo de 0 → **409**; validación Zod de
>   enteros/no-negativos → 400.
> - **Trazabilidad** (SECURITY_MODEL "cambios de stock" auditables): cada
>   escritura registra un `StockMovement` (ledger: variante, tipo, delta, antes/
>   después, motivo) y, cuando hay operador autenticado, una entrada en
>   `AuditLog` (`inventory.set|adjust`, actor, metadata). El alta/edición de
>   producto con `stock` deja movimiento `initial`.
> - El Admin de inventario exige sesión (JWT) y se conecta solo con
>   `VITE_AUTH_MODE=api`; en modo dev el repositorio local no permite escrituras.

> **NL-09:** **Subida de imágenes con validación y RBAC** —
> - Permisos nuevos (seed): `media:ver`, `media:subir`, `media:eliminar`;
>   `GET /api/media/file/:key` es **público** (solo lectura de blob), el resto
>   exige JWT + permiso exacto.
> - **Whitelist de mimes** (JPEG/PNG/WEBP/GIF) en backend + límite
>   `UPLOAD_MAX_MB` (default 5 MB); entrada no confiada al cliente.
> - Blob sin colisiones por UUID en storage local; la **URL se valida con
>   `basename`** contra path traversal; respuesta con `nosniff` y content-type
>   derivado del mime (no del nombre del archivo).
> - **Borrado seguro**: `DELETE /api/media/:key` rechaza con **409** si la
>   imagen está referenciada por un producto; `DELETE
>   /api/products/:id/images/:imageId` expone `productos:editar` y remueve del
>   blob local (driver `MediaStorage` reemplazable por S3 en NL-13/14 sin tocar
>   el contrato).
> - Auditoría de `media.upload|delete` (actor) cuando hay sesión.

> **NL-10: Pedidos con validación de stock/precios en el servidor** —
> - **S-06 precios MITIGADO**: `unitPrice`, `lineTotal` y `totalAmount` del
>   pedido se calculan **en el backend** desde el precio de la variante
>   (`priceOverride` nulo → `basePrice`); el cliente solo manda `quantity` +
>   `productVariantId` (Zod estricto, UUID real). El checkout del Store (NL-11)
>   no calculará totales confiables.
> - **S-06 stock reforzado**: al crear el pedido se **reserva** (`reserved +=
>   qty`) y se valida **no-sobreventa** contra `available = stockOnHand −
>   reserved` → **409** si no alcanza (misma regla que NL-08).
> - **Transiciones con efecto fiscal de stock**: `pending→confirmed` conserva la
>   reserva; `→cancelled` la libera (`reserve`/`release` en el ledger); `→completed`
>   consume (`stockOnHand −= qty`, `reserved −= qty`). Todo dentro de la misma
>   transacción Prisma con `StockMovement` + `AuditLog` (`order.create|status`,
>   actor opcional; el `create` anónimo no tiene actor pero guarda metadata
>   ip/userAgent/source).
> - **S-03 MITIGADA**: el número de negocio `WHATSAPP_NUMBER` vive en el entorno
>   del servidor; el mensaje y el enlace `wa.me` se construyen en el backend
>   (puerto `WhatsAppProvider`, fake/log en NL-10). El cliente del Store ya no
>   incrusta el número.
> - `POST /api/orders` es **anónimo** (apartado del checkout Store); el
>   listado/detalle exige `pedidos:ver` y el PATCH de estado `pedidos:gestionar`
>   (permisos en seed). `GET /api/orders/:id` valida ownership solo por permiso
>   (no expone 404 vs 403 a anónimos).

> **NL-11: el Store consume la API (catálogo + pedidos) sin confiar en el
> cliente** —
> - **S-06 precios MITIGADO (efectivo en el cliente)**: el Store muestra el
>   catálogo del servidor y en el checkout **no calcula totales que valgan**:
>   `POST /api/orders` devuelve `totalAmount` del backend y la UI lo muestra
>   como "Total (servidor)"; el precio mostrado en catálogo/carrito usa
>   `priceOverride ?? basePrice` del REST.
> - **S-06 stock visible**: disponibilidad del catálogo = `stock − reserved`
>   reales del API (los botones AGOTADO/cap de cantidad son anti-fricción, la
>   garantía dura sigue siendo el `409` server-side — sin sobreventa).
> - **S-03 MITIGADA (sin número del negocio en el cliente)**: el `wa.me` del
>   pedido lo entrega el servidor (`whatsappLink`); `VITE_WHATSAPP_NUMBER` queda
>   solo como fallback offline de confirmación manual y no es el número del
>   negocio.
> - **Ataques repetidos / sobreventa por UI**: el catálogo es público y de solo
>   lectura (PORT de productos recortado a `listActive`); el `409` es
>   idempotente ante reintentos (el StockMovement `reserve` solo se emite si hay
>   disponible).
> - **Offline con límite**: la caché last-known-good muestra el último catálogo
>   con aviso visible ("MODO SIN CONEXIÓN"); el POST requiere conexión (si cae,
>   el cliente ofrece reintentar o confirmación manual, no persiste nada local
>   que valga como pedido).
> **NL-12: Testing & seguridad (hardening backend + auditoría + CSP)** —
> - **Capa HTTP endurecida**: `helmet()` (headers: `nosniff`, CSP `default-src 'self'`,
>   `frame-ancestors 'none'`), body JSON limitado a 1 MB, CORS con allow-list (nunca `*`)
>   y **rate limiting por IP** (`express-rate-limit`) por ruta: global 300/min,
>   `POST /api/auth/login` 5/min, `/api/auth/refresh` 10/min, `POST /api/orders` 10/min
>   → **429** (anti fuerza bruta/abuso). `configureApp()` compartida con tests.
> - **Config fail-fast (S-04)**: `validateEnv()` con zod aborta el boot ante secretos
>   ausentes, de ejemplo o débiles (<32 en prod), `JWT_ACCESS === JWT_REFRESH`, CORS `*`
>   u origen no-http. **S-04 CERRADA** (ya no hay path "seguro" con secretos de ejemplo).
> - **Filtro global de errores sin leaks (S-05)**: shape `{statusCode,message,error,path,timestamp}`,
>   mapea P2002→409/P2025→404, nunca expone stack ni internos de Prisma.
> - **Refresh tokens con rotación + replay (S-02)**: reusar un refresh ya revocado
>   revoca TODA la familia del usuario → **401** (robo mitigado). `POST /api/auth/register`
>   ahora exige `usuarios:gestionar` además de `SUPER_ADMIN` (menos privilegio para admins).
> - **Media por magic bytes (S-05)**: `mediaSignatureMatches()` rechaza SVG y contenido
>   disfrazado (HTML de "PNG") → **400** (elf: ejecutables protegidos).
> - **PII en logs enmascarada (S-03)**: en `fake-whatsapp` el teléfono se enmascara
>   (`573***567`) y no se loguea contenido del mensaje.
> - **Auditoría central legible**: `GET /api/audit` (permiso `auditoria:ver`, seed
>   SUPER_ADMIN/ADMIN) lista por action/entity/actor con paginación acotada; todas las
>   escrituras sensibles (auth/inventory/media/orders/products) registran `AuditLog`
>   **best-effort** (no rompe el flujo si falla). Alta/edición/baja de productos auditan
>   al actor (antes solo inventario/pedidos/media).
> - **Paginación acotada (S-05)**: `limit` 1..100 (default 50) en listados admin y
>   catálogo público limitado a 500 → 400 si se excede (evita consultas sin límite).
> - **Mass-assignment (S-05)**: schemas de auth estrictos con zod (`.strict()`) → 400 ante
>   campos extra (`forbidNonWhitelisted` para ValidationPipe). Nuevo e2e de seguridad
>   (15 casos) cubre RBAC, replay, 429, CORS, headers y shape de errores.
> - **CSP en apps cliente**: Store y Admin publican con `<meta>` CSP estricto
>   (`script-src 'self'`, `connect-src 'self' <VITE_API_URL>`, `frame-ancestors 'none'`);
>   el Admin en PROD **fuerza** backend real (`VITE_AUTH_MODE=api`) — S-12.
> - **Cobertura como gate**: umbrales `{stmts 80, branches 70, funcs 80, lines 80}` en
>   `test:coverage`; nuevo e2e `security.e2e-spec.ts`. Ver CHANGELOG [0.12.0] y ADR-NL-020.
