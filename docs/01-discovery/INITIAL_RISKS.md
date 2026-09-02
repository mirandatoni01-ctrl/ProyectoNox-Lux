# INITIAL RISKS — NOX & LUX

**Fase:** 01 — Discovery
**Bloque:** NL-00 / NL-01

## Riesgos críticos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-01 | El MVP no era un proyecto ejecutable (sin build tooling) | No publicable/no testeable | Scaffold Vite en NL-01 |
| R-02 | Autorización falsa (botón CUSTOMER/ADMIN) | Agujero de seguridad en producción | Auth real en NL-03 |
| R-03 | Datos solo en memoria | Pérdida de cambios | Persistencia en NL-02 |
| R-04 | Cámara simulada + imágenes remotas | Experiencia y dependencia externa | Capacitor + local en NL-08 |

## Riesgos importantes

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-05 | IDs de carrito compuestos de texto | Colisiones / modelo incorrecto | `variantId` real en NL-06 |
| R-06 | Stock no validado al incrementar | Pedidos imposibles | Validación en NL-06 |
| R-07 | Número WhatsApp hardcodeado | Configuración frágil | Env vars en NL-01/NL-07 |
| R-08 | Número WhatsApp placeholder | No operativo hasta darlo | Pendiente PO |
| R-09 | Sin pruebas del MVP | Regresiones indetectables | Vitest en NL-01, ampliar en NL-04+ |

## Deuda técnica del monolito

- UI + lógica + datos en un solo componente → refactor NL-04.
- Sin tipado completo previo → tipos base en NL-01.
- `setTimeout` de toast sin limpieza → corregir en refactor.

## Riesgo de producción (decisión pendiente)

- **Backend**: la elección de persistencia/backend define costos y arquitectura.
  Aprobado "local primero" para MVP-1; migración a backend futuro debe mantenerse
  como puerto. Ver `ADR-NL-012` (renumerado).

> **NL-00 (redirección):** los bloque de mitigación originales (NL-03 backend,
> NL-08 imágenes, NL-06 variantes) quedan superados por el roadmap NL-01..14
> (ver MIGRATION_STRATEGY.md). Añadir como riesgos de la nueva arquitectura:
> decisión de infraestructura pendiente (ADR-NL-007), reglas de inventario y
> pedidos sin definir, y coste de re-ingeniería del backend.