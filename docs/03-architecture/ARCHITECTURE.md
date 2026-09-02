# ARCHITECTURE — NOX & LUX

**Fase:** 03 — Arquitectura
**Bloque:** NL-02 (estado del MVP) · **supersedido por:** ARCHITECTURE_BLUEPRINT_V1.md

> **NOTA (NL-00):** Este documento describía la arquitectura del MVP (una sola web
> app con IndexedDB). Desde el bloque NL-00 el proyecto adopta la arquitectura de
> **3 sistemas separados** (STORE / ADMIN / BACKEND) cuyo documento maestro es
> `ARCHITECTURE_BLUEPRINT_V1.md`. Este archivo se conserva como registro del
> estado del MVP previo a la redirección.

## Vista general (MVP histórico)

```
┌─────────────────────────────────────────────────────────┐
│                        UI (App.tsx)                      │
│  Catálogo · Carrito · Admin · Modales                    │
└───────────────▲───────────────────────────▲─────────────┘
                │ acciones                  │ datos
                ▼                           ▲
        ┌───────────────┐           ┌───────┴───────┐
        │ usePersistent │           │ filtros /     │
        │ Store (hook)  │           │ cálculos UI   │
        └───────┬───────┘           └───────────────┘
                │ ports
                ▼
   ┌────────────────────────────┐
   │ Repositorios (interfaz)    │  ProductRepository, CartRepository
   └───────┬────────────────────┘
           │ implementación local
           ▼
   IndexedDB (Dexie)  →  productos, carrito
```

## Capas (MVP)

- **Presentación**: `src/app`, `src/components`.
- **Estado/datos**: `src/hooks/usePersistentStore.ts`.
- **Datos (ports)**: `src/services/repositories/*`.
- **Persistencia**: `src/services/storage/db.ts` (Dexie/IndexedDB).
- **Tipos**: `src/types` · **Constantes**: `src/constants`.

## Destino del MVP en la nueva arquitectura (NL-00)

- El **STORE** conserva tipos, constantes, catálogo, carrito e identidad visual.
- Los **repositorios** del Store migran de IndexedDB a **REST contra el API**
  (ADR-NL-001/003) — **✅ hecho en NL-11** (catálogo `GET /api/products/catalog`
  + pedidos `POST /api/orders`; `CachedProductRepository` dual con caché
  offline). ADR-NL-003 queda **validado** (ver ADR-NL-019).
- El **panel admin integrado y el selector de rol** se eliminan del Store y se
  reconstruyen en el **Admin Panel** independiente (ADR-NL-002/006; NL-06).
- La persistencia local queda como **fallback/desarrollo** (ADR-NL-012) y desde
  NL-11 como **caché offline last-known-good** del Store.

## Decisiones registradas

- ADR-NL-011 Stack: Vite + React + TS + Tailwind (APROBADO).
- ADR-NL-012 Persistencia local + port (APROBADO; reclasificado a fallback).
- ADR-NL-013 Autenticación por puerto (APROBADO; supersedido en producción).
- ADR-NL-014 Capacitor (APROBADO; rige el Store).
- ADR-NL-015 Imágenes locales (APROBADO; migrar a Object Storage).
- ADR-NL-016 WhatsApp por env (APROBADO).

Ver `ARCHITECTURE_BLUEPRINT_V1.md` y `docs/adr/README.md` para el mapa completo.
