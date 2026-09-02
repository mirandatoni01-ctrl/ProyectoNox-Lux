# ADR-NL-011 — Stack del proyecto: Vite + React + TypeScript + Tailwind

**Estado:** APROBADO
**Renumerado:** antes ADR-NL-001 (la nueva directiva reserva ADR-NL-001..007 para el ecosistema Store/Admin/Backend).

## Contexto
El MVP era un único componente `.tsx` sin andamiaje ni build tooling. No era
ejecutable, testeable ni publicable.

## Problema
Seleccionar la base tecnológica sobre la cual construir el proyecto, reutilizando
al máximo el código existente y preparando la salida a Android vía Capacitor.

## Opciones consideradas
- **A)** Vite + React + TS + Tailwind: reutiliza el código, rápido, ideal para
  envolver con Capacitor. *(elegida)*
- **B)** Next.js: SSR/rutas por archivo, más pesado, menos sentido para una app
  móvil Android.
- **C)** Mantener archivo único sin scaffold: no mantenible ni publicable.

## Decisión propuesta
Vite + React + TypeScript + Tailwind. Vite fijado a **v7** (compatibilidad con
Vitest 3), `@vitejs/plugin-react` v5.

## Ventajas
- Reutiliza el 100% del componente actual.
- Ruta directa a Android con Capacitor.
- Ecosistema maduro y rápido (HMR).

## Desventajas
- No es una app nativa por sí sola (se resuelve con Capacitor).
- Vite 8 (rolldown) quedó excluido temporalmente por compatibilidad con Vitest.

## Impacto técnico
Scaffold completo creado en NL-01.

## Impacto en producción
Base estable para builds y futura generación de APK/AAB.

## Riesgos
Bajos. Cambio de versión de Vite es menor y documentado.

---
*Ver también: DEPENDENCY_AUDIT.md*