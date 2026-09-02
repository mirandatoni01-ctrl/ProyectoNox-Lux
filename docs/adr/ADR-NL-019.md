# ADR-NL-019 — Store consume API (catálogo + pedidos REST; local → offline)

**Estado:** IMPLEMENTADO (NL-11)
**Fecha:** 2026-08-31
**Contexto:** Valida **ADR-NL-003** (fuente central de verdad, cliente
subordinado al API): en NL-11 el Store deja de leer su catálogo de IndexedDB
(motivo: la BD local se poblaría desincronizada del inventario real del Admin)
y pasa a consumir los endpoints REST del backend. Recoge las cuatro decisiones
del PO tomadas antes de la implementación.

## Contexto
Hasta NL-10 el catálogo del Store vivía en IndexedDB (recargado en local) y el
pedido se confirmaba "en vivo" por chat con el número de negocio incrustado en
el cliente. En paralelo el backend (NL-03..10) ya es la fuente de verdad de
productos (`priceOverride`), inventario (`stockOnHand`/`reserved`), pedidos y
WhatsApp (`wa.me` server-side). Llega el momento de que el comprador vea y
compre contra el backend: disponibilidad real y precios del servidor.

## Problema
Migrar el Store a "cliente del API" sin regresiones de UX offline: catálogo
de fuentes mixta (API + persistencia local), checkouts no confiables, y
decisión sobre qué datos sigue viviendo en el cliente.

## Opciones consideradas y decisión (PO)

1. **Enlace de WhatsApp del pedido**
   - A) El cliente construye el `wa.me` (mantiene `VITE_WHATSAPP_NUMBER`).
   - B) **El servidor devuelve `whatsappLink` en la respuesta de
     `POST /api/orders`** *(elegida)*: el número de negocio nunca viaja al
     cliente (refuerza S-03) y el mensaje queda 100% server-side.
2. **Soporte offline**
   - A) Service Worker (PWA) con precaché de rutas + catálogo.
   - B) **Caché "last-known-good" sin SW** *(elegida)*: `CachedProductRepository`
     online-first → refresca IndexedDB → si la red cae sirve el último catálogo
     y la UI avisa "MODO SIN CONEXIÓN". Menor superficie, sin ciclo de vida de
     SW; el alta de pedido requiere conexión (409/400 del servidor son la
     garantía dura).
3. **Port `ProductRepository` del Store**
   - A) Mantenerlo read/write (CRUD local).
   - B) **Recortarlo a solo lectura** (`listActive`) *(elegida)*: el alta/baja
     vive solo en el Admin (NL-06); se elimina `create`/`update`/`toggleActive`
     que ya no tenían consumidor.
4. **Carrito tras confirmar por WhatsApp**
   - A) Mantener el carrito tras abrir WhatsApp.
   - B) **Vaciar el carrito al abrir WhatsApp** *(elegida)*: evita dobles
     confirmaciones; el pedido ya quedó persistido en el backend.

## Decisión propuesta
- **Catálogo**: `GET /api/products/catalog` (público) con variantes `id`,
  `stock`, `reserved`, `priceOverride`; disponibilidad UI = `stock − reserved`
  (la garantía anti-sobreventa sigue siendo el `409` server-side).
- **Pedido**: `POST /api/orders` (anónimo) con `productVariantId + quantity`;
  total y `whatsappLink` del **servidor**; estados UI `form | submitting |
  success` con 409/400/red diferenciados.
- **Offline**: `CachedProductRepository` (online-first + caché local
  last-known-good + aviso); sin Service Worker.
- **Datos**: `CartItem.productVariantId` requerido; migración Dexie **v1→v2**
  descarta carritos legados (no pedibles); `ProductVariant` gana id/reserved/
  sku/status (del REST); `Order.whatsappLink?`.
- **Env**: `VITE_API_URL` (default `http://localhost:3000`) y
  `VITE_WHATSAPP_NUMBER` solo como fallback offline de confirmación manual.

## Ventajas
- El comprador ve stock/precios **reales del backend** (sin BD local desincronizada).
- Sin sobreventa por UI y sin precios "confiables" en el cliente (S-06).
- Offline simple (caché last-known-good) sin la complejidad de un SW.
- El número de negocio solo existe en el servidor (S-03).

## Desventajas / costes
- El Store depende de conexión para confirmar pedidos (aceptado; el fallback es
  confirmación manual).
- La caché puede quedar desactualizada con el inventario real si el usuario no
  recarga (aviso explícito en UI offline).
- Se pierden carritos guardados antes de NL-11 (migración Dexie v1→v2).

## Impacto técnico
- `apps/store`: `services/api/client.ts`, `repositories/{types,api/*,local/*,
  CachedProductRepository,index}`, `storage/db.ts` (v2), `hooks/
  usePersistentStore.ts` (catálogo API+caché, cap de cantidad, `createOrder`),
  `app/App.tsx` (checkout 3 estados), `.env.example`.
- `packages/shared`: `ProductVariant`, `CartItem.productVariantId`,
  `Order.whatsappLink?` (todos aditivos; sin cambios en Admin/API).
- Backend: **sin cambios** (lo requerido ya existía desde NL-07/10).

## Riesgos
- Cambios futuros del contrato REST del catálogo (campos variants) rompen el
  mapper — protegido por tests (`api/mappers` + `ApiProductRepository`).
- `absoluteMediaUrl` solo cubre `/api/` y http(s); una nueva base de media
  requiere ajuste (S3 en NL-13/14).

## Referencias
ADR-NL-003 (fuente central de verdad), ADR-NL-012 (persistencia local →
fallback/desarrollo), SECURITY_AUDIT.md (S-03/S-06), MIGRATION_STRATEGY.md
(NL-11), CHANGELOG [0.11.0].