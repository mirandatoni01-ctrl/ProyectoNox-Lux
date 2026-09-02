# MVP AUDIT — NOX & LUX

**Fase:** 02 — Auditoría del MVP
**Bloque:** NL-00

## Alcance

Auditoría del MVP original (`nox_lux_mobile_application.tsx`) antes de su
migración al nuevo andamiaje. Clasificación de cada funcionalidad según el
Método Nova: **REAL / PARCIAL / SIMULADA / NO IMPLEMENTADA / RIESGO**.

## Resumen

| Categoría | Cantidad |
|---|---|
| REAL | 7 |
| PARCIAL | 6 |
| SIMULADA | 1 |
| NO IMPLEMENTADA | 6 |
| RIESGO | 1 |

## Incidencias del contrato verificadas

- `NL-ISSUE-001` Datos en memoria → **CONFIRMADO** (resuelto en NL-02, persistencia IndexedDB).
- `NL-ISSUE-002` Cambio manual de rol → **CONFIRMADO** (RIESGO).
- `NL-ISSUE-003` Cámara simulada → **CONFIRMADO**.
- `NL-ISSUE-004` Galería no implementada → **CONFIRMADO**.
- `NL-ISSUE-005` Stock no validado → **CONFIRMADO**.
- `NL-ISSUE-006` Pedido WhatsApp no persistente → **CONFIRMADO**.
- `NL-ISSUE-007` Número WhatsApp en código → **CONFIRMADO**.
- `NL-ISSUE-008` Edición limitada → **CONFIRMADO**.
- `NL-ISSUE-009` Formulario crea una variante → **CONFIRMADO**.
- `NL-ISSUE-010` Componente monolítico → **CONFIRMADO**.

## Incidencias nuevas descubiertas

- `NL-ISSUE-011` Sin scaffold/build tooling → CRÍTICO.
- `NL-ISSUE-012` IDs de carrito compuestos de texto.
- `NL-ISSUE-013` Incremento de cantidad sin límite de stock.
- `NL-ISSUE-014` Sin subida de imágenes (URLs externas).
- `NL-ISSUE-015` `MATERIAL_LABELS` podría devolver `undefined`.
- `NL-ISSUE-016` Sin tipado TS.
- `NL-ISSUE-017` `setTimeout` de toast sin limpieza.
- `NL-ISSUE-018` Sin estados de carga/vacío/red.
- `NL-ISSUE-019` `parseFloat`/`parseInt` sin sanitizar.
- `NL-ISSUE-020` Accesibilidad pobre en modales.
- `NL-ISSUE-021` Sin contenedor móvil real.
- `NL-ISSUE-022` Validación de formulario básica.

> **NL-00 (redirección):** Las incidencias permanecen válidas; su resolución se
> planifica ahora en el roadmap NL-01..14 (ver MIGRATION_STRATEGY.md). Las que
> dependían de "backend futuro" quedan cubiertas por ADR-NL-001/003/005.