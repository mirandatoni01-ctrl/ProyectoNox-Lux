# TECHNICAL DEBT — NOX & LUX

**Fase:** 02 — Auditoría
**Bloque:** NL-00

## Deuda estructural

| # | Deuda | Bloque de pago |
|---|---|---|
| TD-01 | Componente monolítico concentra UI+negocio+datos | NL-04 |
| TD-02 | Sin capa de datos / repositorio intercambiable | NL-02 |
| TD-03 | IDs de carrito compuestos de texto | NL-06 |
| TD-04 | Rutas por `activeTab` (sin router) | NL-04 (evaluar) |
| TD-05 | Datos mock embebidos en el componente | NL-02 (mover a capa de datos) |

## Deuda de calidad

| # | Deuda | Bloque de pago |
|---|---|---|
| TD-06 | `MATERIAL_LABELS` con posible `undefined` | NL-04/NL-05 |
| TD-07 | `setTimeout` de toast sin limpieza | NL-04 |
| TD-08 | `parseFloat`/`parseInt` sin validación | NL-05 |
| TD-09 | Sin manejo de estados de carga/vacío/red | NL-04+ |
| TD-10 | Sin cobertura de pruebas más allá del smoke | NL-04+ |

## Criterio

La deuda no se paga en una sola gran refactorización (contrato lo prohíbe). Se
reduce de forma **progresiva y verificable** bloque a bloque.

> **NL-00 (redirección):** Los bloques de pago originales (NL-02..NL-05) pasan al
> roadmap NL-01..14. La mayor deuda estructural del MVP (monolito App.tsx y
> selector de rol) se resuelve al separar STORE/ADMIN (ADR-NL-002/006) y migrar la
> persistencia al backend (ADR-NL-001/003).