# DATA_MODEL — NOX & LUX

**Fase:** 03 — Arquitectura
**Bloque:** NL-02 (MVP) · NL-00 (modelo objetivo)
**Relacionados:** ADR-NL-005 (PostgreSQL), ARCHITECTURE_BLUEPRINT_V1.md.

## Estado

- **Modelo actual (MVP):** implementado en `src/types/index.ts` y persistido en
  IndexedDB/Dexie (`nox-lux-db` v1).
- **Modelo objetivo (NL-00):** entidades relacionales en **PostgreSQL** con una
  única fuente de verdad (API).
- **Estado NL-04:** modelo canónico **implementado** en `services/api/prisma/schema.prisma`
  (12 entidades) + migración inicial versionada + seed (catálogo y RBAC).
  Pendiente de aplicar con servidor PostgreSQL real (`prisma migrate` + `seed`).
- **Estado NL-05:** añadida la entidad de sesión **`RefreshToken`** (13 tablas;
  hash SHA-256 del token, expiración y revocación para logout/rotación) con su
  migración `nl05_refresh_token`. El resto de entidades siguen igual.
- **Estado NL-13/recorte (0.13.0):** ampliado el modelo para el comprador y el
  soporte — `User.full_name/phone/provider` (perfil, también para CUSTOMER),
  `Order.user_id` opcional (historial `GET /orders/mine`) y nueva entidad
  **`ContactTicket`** (pasarela "Contact Us"; `status` enum
  `new|in_progress|resolved|closed`, `admin_note`, `user_id NULL` onDelete
  SetNull). Migraciones `nl13_profile_customer` y `contact_ticket_profile_fields`.

---

## 1. Modelo actual (MVP, cliente/IndexedDB)

### Product
```
id: string
name: string
category: string        // anillos | cadenas | aretes | pulseras
basePrice: number
material: Material      // STAINLESS_STEEL | COVERGOLD | RHODIUM
description: string
variants: ProductVariant[]
isActive: boolean
imageUrl: string
```

### ProductVariant
```
material: Material
size: string            // talla / medida
stock: number
priceOverride: number
```
> Pendiente en MVP: `id` (variantId), `sku`, `status`, timestamps.

### CartItem
```
id: string              // compuesto (temporal) — migra a variantId real
productId: string
name: string
material: string
size: string
price: number           // priceSnapshot al agregar
quantity: number
imageUrl: string
```

**Persistencia (Dexie):** tabla `products` (clave `id`), tabla `cartItems`
(clave `id`). Esquema en `src/services/storage/db.ts`, versión 1.

---

## 2. Modelo objetivo (PostgreSQL, backend)

Entidades canónicas del API. Detalle de migración: `MIGRATION_STRATEGY.md` y
`SYSTEM_BOUNDARIES.md` (dueño de tablas por módulo).

### USERS
```
id: uuid PK
email: text UNIQUE NOT NULL
password_hash: text NOT NULL      // Argon2id
full_name: text NULL              // NL-13: perfil del comprador/operador
phone: text NULL                  // NL-13: teléfono del comprador
provider: text DEFAULT 'email'    // NL-13: 'email' (contraseña) | 'google'
is_active: boolean DEFAULT true
created_at, updated_at: timestamptz
```
> **NL-13/recorte:** rol `CUSTOMER` (comprador del Store, sin permisos de panel);
> relación 1:N con `ORDERS` (`user_id`) y `CONTACT_TICKETS` (`user_id` NULL,
> onDelete SetNull). Operadores/ADMIN sólo se crean vía `usuarios:gestionar`.

### ROLES / PERMISSIONS / USER_ROLES
```
ROLES:          id, code (unique), name, description, created_at
PERMISSIONS:    id, code (unique), name, description
USER_ROLES:     user_id FK, role_id FK   (PK compuesta)
ROLE_PERMISSIONS: role_id FK, permission_id FK  (mapeo rol→permiso)
```
RBAC detallado en `SECURITY_MODEL.md`.

### PRODUCTS
```
id: uuid PK
name: text
slug: text UNIQUE
category: text                  // anillos | cadenas | aretes | pulseras
description: text
is_active: boolean DEFAULT true
base_price: numeric(12,2)
material_default: text          // material por defecto
created_at, updated_at
```

### PRODUCT_VARIANTS
```
id: uuid PK
product_id FK -> PRODUCTS
sku: text UNIQUE
material: text
size: text
price_override: numeric(12,2) NULL
status: text                    // active | hidden | archived
created_at, updated_at
```

### PRODUCT_IMAGES
```
id: uuid PK
product_id FK -> PRODUCTS
url: text
alt: text
position: int
is_primary: boolean
(almacenamiento local servido por la API desde NL-09; migrar a Object Storage
S3-compatible en NL-13/14 — ADR-NL-015)
```

### INVENTORY
```
id: uuid PK
product_variant_id FK -> PRODUCT_VARIANTS  UNIQUE
stock_on_hand: int
reserved: int
available: int  // derivado (on_hand - reserved)
updated_at
```

### STOCK_MOVEMENTS (NL-08)
```
id: uuid PK
product_variant_id FK -> PRODUCT_VARIANTS
type: text               // initial | set | adjust | reserve | release (NL-10)
delta: int               // variación aplicada a stock_on_hand
stock_before: int        // stock_on_hand previo
stock_after: int         // stock_on_hand posterior
reason: text NULL        // motivo opcional (operador)
ref_type: text NULL      // referencia (p.ej. order)
ref_id: text NULL
created_at: timestamptz
```
> Cada escritura de `stock_on_hand` registra un movimiento (ledger) y una
> entrada en AUDIT_LOGS (SECURITY_MODEL.md).
> **Reglas de reserva (NL-10)**: al crear el pedido (pending) se incrementa
> `reserved` por item con un movimiento `reserve` (`ref_type='order'`) y se
> valida no-sobreventa contra `available = stockOnHand − reserved` (409). Al
> cancelar se libera la reserva (`reserved −= qty`, movimiento `release`); al
> completar se consume (`stockOnHand −= qty` y `reserved −= qty`, movimiento
> `release`). En `reserve` el `delta` expresa la cantidad reservada (sin cambio
> de stockOnHand); en `release` refleja el descenso de stockOnHand.

### CUSTOMERS
```
id: uuid PK
name: text
phone: text
email: text NULL
notes: text NULL
created_at, updated_at
```

### ORDERS
```
id: uuid PK
customer_id FK -> CUSTOMERS NULL
user_id FK -> USERS NULL         // NL-13: opcional, comprador autenticado
status: text                  // pending | confirmed | cancelled | completed (NL-10)
total_amount: numeric(12,2)   // calculado en el servidor (S-06)
whatsapp_phone: text          // número que realiza el pedido
source: text                  // store | admin
created_at, updated_at
```
> **Guests vs usuarios (NL-13):** la compra funciona como invitado sin token
> (`OptionalJwtAuthGuard`); si el cliente trae un JWT válido se enlaza
> `user_id`. `GET /orders/mine` devuelve el historial del comprador por `user_id`.
> **Transiciones (NL-10)** lo mismo que abajo; mismo estado → 409; transición no
> permitida → 400. Confirmar conserva la reserva; cancelar libera; completar
> consume (ver STOCK_MOVEMENTS).

### ORDER_ITEMS
```
id: uuid PK
order_id FK -> ORDERS
product_variant_id FK -> PRODUCT_VARIANTS
quantity: int
unit_price: numeric(12,2)     // snapshot
line_total: numeric(12,2)
```

### CONTACT_TICKETS (NL-13)
```
id: uuid PK
user_id FK -> USERS NULL         // comprador logueado; NULL = invitado
name: text
email: text
phone: text NULL
subject: text
message: text
status: text                     // new | in_progress | resolved | closed
admin_note: text NULL            // nota del operador/superadmin
created_at, updated_at: timestamptz
```
> Pasarela "Contact Us" del Store (`POST /tickets`, guard opcional). El estado lo
> gestiona el Admin (`PATCH /api/tickets/:id/status`, RBAC `tickets:gestionar`);
> lectura con `tickets:ver`.

### AUDIT_LOGS
```
id: uuid PK
actor_user_id FK -> USERS NULL
action: text
entity: text                   // productos, orders, inventory...
entity_id: text
metadata: jsonb NULL
ip: text
user_agent: text
created_at: timestamptz
```

---

## 3. Mapeo MVP → PostgreSQL

| MVP (cliente) | API (PostgreSQL) | Nota |
|---|---|---|
| Product | PRODUCTS (+ PRODUCT_VARIANTS + PRODUCT_IMAGES) | splits en relación |
| Product.variants[].stock | INVENTORY (por variant) | normalizado |
| Product.imageUrl | PRODUCT_IMAGES + media backend (fila primaria) | NL-09; ADR-NL-015 |
| Product.basePrice | PRODUCTS.base_price | decimal |
| CartItem (id compuesto) | ORDER_ITEMS (variant_id real) | al crear pedido |
| — (no existía) | USERS / ROLES / PERMISSIONS / AUDIT_LOGS / CUSTOMERS / ORDERS | nuevos |
| Comprador con cuenta (NL-13) | USERS (rol CUSTOMER) + ORDERS.user_id + CONTACT_TICKETS | añadidos en NL-13/recorte |

---

*El modelo objetivo se implementó en NL-04 (esquema Prisma + migración + seed);
los CRUD del API sobre estas entidades llegan en NL-07+. En NL-13/recorte se
amplía el modelo con `User.full_name/phone/provider`, `Order.user_id` y
`CONTACT_TICKETS` (ver migraciones `nl13_profile_customer`,
`contact_ticket_profile_fields`).*
