# DEPENDENCY AUDIT — NOX & LUX

**Fase:** 01 — Discovery
**Bloque:** NL-00 / NL-01
**Fecha:** 2026-08-28

## Dependencias de producción

| Paquete | Versión | Propósito | Estado |
|---|---|---|---|
| `react` | 19.2.8 | Librería UI | OK |
| `react-dom` | 19.2.8 | Render DOM | OK |
| `lucide-react` | 0.475.0 | Iconos | OK |

## Dependencias de desarrollo

| Paquete | Versión | Propósito | Estado |
|---|---|---|---|
| `vite` | 7.3.6 | Bundler / dev server | OK (fijado a v7) |
| `@vitejs/plugin-react` | 5.0.0 | Transform JSX/React | OK (v5, compatible Vite 7) |
| `tailwindcss` | 4.1.13 | Estilos | OK |
| `@tailwindcss/vite` | 4.1.13 | Integración Tailwind+Vite | OK |
| `typescript` | 6.0.2 | Tipos/compilación | OK |
| `vitest` | 3.2.7 | Pruebas | OK |
| `jsdom` | 25.0.1 | Entorno DOM pruebas | OK |
| `@testing-library/react` | 16.2.0 | Testing React | OK |
| `@testing-library/jest-dom` | 6.6.3 | Matchers DOM | OK |
| `oxlint` | 1.79.0 | Linter | OK |
| `@types/react` / `@types/react-dom` | 19.x | Tipos React | OK |

## Notas de compatibilidad (importante)

- El scaffold de Vite original traía **Vite 8** (basado en rolldown), pero **Vitest 3
  bundlea Vite 7** (rollup). La mezcla producía un conflicto de tipos en
  `vite.config.ts`. **Decisión:** fijar Vite a **^7.3.0** y `@vitejs/plugin-react` a
  **^5.0.0**. Ver `ADR-NL-011`.

## Vulnerabilidades

- `npm audit`: **0 vulnerabilidades** reportadas.

## Pendiente / no instalado

- Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/camera`) → bloque **NL-08/NL-09**.
- Backend / BD → por decisión en NL-02 (persistencia local primero).

> **NL-00 (redirección):** El backend ya está decidido como dirección
> (ADR-NL-001: NestJS + Prisma + Argon2id + REST/OpenAPI + Zod; ADR-NL-005:
> PostgreSQL). Las dependencias del backend se instalarán en `services/api`
> dentro del monorepo (NL-03). Capacitor se instala para el Store (bloques
> NL-08/NL-09 actuales).