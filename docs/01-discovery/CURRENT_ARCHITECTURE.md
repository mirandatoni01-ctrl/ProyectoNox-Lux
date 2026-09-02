# CURRENT ARCHITECTURE — NOX & LUX

**Fase:** 01 — Discovery
**Bloque:** NL-00 / NL-01

## Arquitectura del MVP original

La aplicación original es un **monolito**: un único componente `App()` concentra
toda la lógica (estado, handlers, cálculos y JSX) y una única estructura de
`switch` por combinación `role` + `activeTab` decide qué se renderiza.

```
App()  (nox_lux_mobile_application.tsx)
├── Estado local (useState): role, activeTab, products, cart, filtros, modales, formulario
├── Datos mock en memoria: INITIAL_PRODUCTS, CATEGORIES, MATERIAL_LABELS
├── Handlers: carrito, producto (crear/editar/toggle), WhatsApp, toast
└── Render condicional por (role, activeTab)
    ├── CUSTOMER: catalog | cart
    └── ADMIN:    admin_products | admin_add
    + Modales: detalle, WhatsApp, edición
```

## Modelo de datos actual (implícito)

- **Product**: `id, name, category, basePrice, material, description, variants[], isActive, imageUrl`.
- **ProductVariant**: `material, size, stock, priceOverride`.
- **CartItem**: `id (compuesto de texto), productId, name, material, size, price, quantity, imageUrl`.

## Limitaciones arquitectónicas

1. **Acoplamiento total**: UI + negocio + datos en un solo componente.
2. **Rutas por strings**: `activeTab` no escala y no permite URL/estado de navegación.
3. **Datos en memoria**: se pierden al recargar (NL-ISSUE-001).
4. **IDs de carrito compuestos** de texto (NL-ISSUE-012).
5. **Sin capa de datos**: no hay repositorio ni servicio intercambiable hacia backend.

## Estado objetivo (hoja de ruta)

La estructura objetivo del Método Nova (features + services + types) se creó en
NL-01. El monolito se descompone progresivamente a partir de NL-04, sin
interrumpir la funcionalidad.

> **NL-00 (redirección):** Este documento registra la arquitectura del MVP. Desde
> NL-00 la arquitectura objetivo es la de **3 sistemas separados**
> (STORE / ADMIN / BACKEND) descrita en `ARCHITECTURE_BLUEPRINT_V1.md`. El monolito
> se separa en STORE y ADMIN (NL-01/NL-02/NL-06) y el backend se construye desde
> cero (NL-03..NL-10).