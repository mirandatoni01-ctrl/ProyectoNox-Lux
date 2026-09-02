# ADR-NL-017 — Monorepo con npm workspaces

**Estado:** IMPLEMENTADO (NL-01 + NL-02)
**Fecha:** 2026-08-28
**Decisión PO:** Opción A (single monorepo) — aprobada en NL-00.
**Relacionados:** ADR-NL-002 (Store/Admin), ADR-NL-004 (Modular Monolith).

## Contexto

Tres sistemas (STORE, ADMIN, BACKEND) comparten tipos de dominio. El Store era un
proyecto Vite independiente en la raíz. Se necesita un único repositorio que
aloje los tres sistemas y un paquete de tipos compartidos sin duplicación.

## Decisión

Usar un **monorepo gestionado con npm workspaces**:

```
apps/store/       STORE app (@nox-lux/store)
apps/admin/       ADMIN panel (@nox-lux/admin) — ubicación reservada (NL-06)
services/api/     NOX & LUX API (@nox-lux/api) — ubicación reservada (NL-03)
packages/shared/  @nox-lux/shared — tipos de dominio compartidos
```

- Config raíz `package.json` con `workspaces: ["apps/*","services/*","packages/*"]`.
- Opciones de TypeScript compartidas en `tsconfig.base.json` con path mapping
  `@nox-lux/shared`.
- `@nox-lux/shared` se consume como **fuente TypeScript** (sin paso de build): el
  bundler (Vite) y tsc lo resuelven directamente.

## Consecuencias

- Dependencias hoisted en la raíz; un único `package-lock.json`.
- El Store migró de la raíz a `apps/store/` (build/test/lint/preview verificados).
- `@nox-lux/shared` es la fuente única de verdad tipada (Material, Product,
  CartItem, etc.); el Store re-exporta desde él.
- **Nota de compatibilidad:** npm **no soporta** el protocolo `workspace:*`
  (de pnpm/yarn); en npm la dependencia local se declara como `"*"`.
- El paquete compartido usará una estrategia de publicación interna (consumido
  vía workspaces, no publicado a npm público).

## Alternativas descartadas

- **Multi-repo separado** (un repositorio por sistema): dificulta compartir tipos
  y versionar el ecosistema junto (rechazado por el PO: Opción A ganadora).
- **pnpm workspaces** (soportaría `workspace:*`): disponible globalmente, pero se
  mantiene npm por consistencia con el flujo existente y menor cambio de
  herramienta.
