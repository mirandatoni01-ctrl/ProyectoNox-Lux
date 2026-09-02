# PROJECT OVERVIEW — NOX & LUX

**Documento:** 00 — Project
**Versión:** 0.2.0 · **Arquitectura:** v1.0 (NL-00)

## Qué es

**NOX & LUX** — ecosistema de software para la gestión y venta de joyería de la
marca NOX & LUX (bisutería fina: Covergold, acero inoxidable 316L, rodio).
Compuesto por **tres sistemas separados**: Store (cliente), Admin (operación
privada) y Backend propio (fuente central de verdad).

## Sistemas

- **STORE APP** (cliente): catálogo, búsqueda, filtros, detalle, variantes/tallas,
  carrito, pedido vía WhatsApp. Futuro: pedidos/pagos estructurados. Publicación:
  PWA/web + Android (Capacitor).
- **ADMIN PANEL** (privado): autenticación y gestión de productos, variantes,
  inventario, pedidos, clientes, media y usuarios/roles/permisos.
- **NOX & LUX API** (backend): REST, fuente de verdad, PostgreSQL + media +
  auditoría. Detalle en ARCHITECTURE_BLUEPRINT_V1.md.

## Estado actual

- Store App MVP (frontend con persistencia local) operativo y testeado (9/9).
- **NL-00 completado (documentación):** arquitectura 3-sistemas definida,
  blueprint y ADR creados, roadmap NL-01..14 propuesto. **Sin cambios de código**.
- Backend aún no construido (próximos bloques NL-03..NL-10).
- Autorización y admin externos pendientes de construir.

## Estrategia de producción

`MVP → redirección 3-sistemas (NL-00) → backend+admin+store sobre API
(NL-01..11) → testing/seguridad (NL-12) → staging (NL-13) → producción (NL-14)`

Documentos de referencia: `docs/03-architecture/ARCHITECTURE_BLUEPRINT_V1.md`,
`docs/adr/README.md`, `PROJECT_STATUS.md`.
