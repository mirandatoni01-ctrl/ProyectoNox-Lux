# PROJECT INVENTORY — NOX & LUX

**Fase:** 01 — Discovery
**Bloque:** NL-00 / NL-01
**Fecha:** 2026-08-28

## Contexto

El MVP original se entregó como **un único componente React autocontenido** en
`nox_lux_mobile_application.tsx` (1001 líneas), sin andamiaje de proyecto.

## Estado del repositorio en la entrega

| Ítem | Valor |
|---|---|
| Framework | React funcional (solo un componente `App`) |
| Build tooling | Ninguno |
| TypeScript | Extensión `.tsx`, sin tipos declarados |
| Estilos | Clases Tailwind sin configuración |
| Rutas | Estado `activeTab` (string) |
| Estado global | `useState`/`useMemo` locales |
| Integración móvil | Ninguna (simulador web para escritorio) |
| Pruebas | Ninguna |
| Backend / BD / API | Ninguno |
| Seguridad | Ninguna |

## Contenido inicial de la carpeta

- `nox_lux_mobile_application.tsx` — MVP monolitico (referencia histórica).
- `contrato del proyecto con open code.txt` — master prompt / Método Nova.

## Andamiaje creado en NL-01

```
project-root/
├── src/
│   ├── app/                    # App.tsx (componente raíz del MVP migrado)
│   ├── components/{ui,shared}  # (vacías, se llenan en NL-04)
│   ├── constants/              # CATEGORIES, MATERIAL_LABELS, INITIAL_PRODUCTS
│   ├── features/               # catalog, cart, admin, orders, authentication, products
│   ├── hooks/  lib/  services/ # (vacías, uso posterior)
│   ├── test/                   # setup.ts + App.smoke.test.tsx
│   ├── types/                  # Tipos base del dominio
│   └── main.tsx / index.css
├── docs/                       # Documentación viva del proyecto
├── .env.example
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

## Herramientas de build

- **Vite 7.3.6** (rolldown no; se fijó a Vite 7 para compatibilidad con Vitest 3).
- **React 19.2.8** + **TypeScript 6.0.2**.
- **Tailwind CSS 4.1.13** (vía `@tailwindcss/vite`).
- **Vitest 3.2.7** + Testing Library (jsdom).
- **oxlint** como linter.

> **NL-00 (redirección):** Este inventario describe el MVP. La estructura del
> proyecto evoluciona a un **monorepo** con `apps/store`, `apps/admin`,
> `services/api` y `packages/shared` (decisión del PO aprobada en NL-00; ver
> ARCHITECTURE_BLUEPRINT_V1.md). El monorepo se materializa en NL-01/NL-02.