# STATE_MANAGEMENT — NOX & LUX

**Fase:** 03 — Arquitectura
**Bloque:** NL-02

## Estrategia

- **Estado local de UI** (modales, filtros, formularios, toast): `useState` en el
  componente. Se modularizará en NL-04.
- **Estado de datos (productos + carrito)**: centralizado en el hook
  `usePersistentStore` (`src/hooks/usePersistentStore.ts`), que es la única puerta
  de entrada/salida de datos desde la UI.

## Flujo

```
UI (App.tsx)
   │  llama a acciones (addToCart, createProduct, ...)
   ▼
usePersistentStore
   ├── estado local (useState) para render inmediato
   └── persiste vía repositorio (port)
          ▼
   ProductRepository / CartRepository  (IndexedDB, Local*Repository)
```

- La UI se actualiza de forma optimista (setState inmediato) y persiste en segundo
  plano; errores de persistencia se reflejan en un estado `error`.
- Carga inicial asíncrona con estado `isLoading`.

## Puerto / inyección

Los repositorios se resuelven mediante fábrica (`src/services/repositories/index.ts`).
Cambiar la fuente de datos (backend futuro) solo implica modificar la fábrica
(ADR-NL-012), sin tocar la UI.

## Persistencia

- `products` (caché de catálogo) y `cartItems` en IndexedDB (Dexie v2). Ver
  `DATA_MODEL.md`.
- Desde **NL-11** la fuente canónica del Store es el **API** (ADR-NL-003,
  validado en ADR-NL-019): `CachedProductRepository` lee `GET
  /api/products/catalog` (online) y refresca IndexedDB como caché
  last-known-good; si la red cae sirve la caché con aviso "MODO SIN CONEXIÓN".
  Los pedidos se crean contra `POST /api/orders` (`ApiOrderRepository`); el
  hook (fábrica de repositorios) se preserva con la implementación `Api*`.