# NOX & LUX — Essential Jewelry

El presente proyecto es el MVP de un e-commerce de prendas de metal en Colombia.
Ecosistema de gestión y venta de joyería de NOX & LUX, compuesto por **tres
sistemas separados**:

- **STORE APP** — experiencia de cliente (catálogo, carrito, pedido).
- **ADMIN PANEL** — operación privada (productos, inventario, pedidos, usuarios).
- **NOX & LUX API** — backend propio, fuente central de verdad (PostgreSQL).

> Arquitectura v1.0 (3 sistemas) aprobada en **NL-00**. Detalle:
> `docs/03-architecture/ARCHITECTURE_BLUEPRINT_V1.md` y `docs/adr/README.md`.

## Stack (por sistema)

- **Store** (`apps/store`): Vite 7 + React 19 + TypeScript 6 + Tailwind 4 + Vitest 3.
- **Admin** (`apps/admin`): Vite 7 + React 19 + TypeScript 6 + Tailwind 4 +
  **react-router v7** + Vitest 3. Panel independiente (NL-06) con login contra la
  API y módulo de productos.
- **API** (`services/api`): NestJS 12 + Prisma 7 + PostgreSQL + Argon2id + REST/OpenAPI + Zod. Fundación (NL-03), modelo de datos (NL-04), **auth/RBAC real** (NL-05: login dual Google + contraseña, JWT access/refresh) y CORS + `/me` con roles (NL-06).
- **Shared** (`packages/shared`): tipos de dominio compartidos (`@nox-lux/shared`).
- Transversal: oxlint · (futuro) Capacitor para Android.

## Estructura del monorepo

```
apps/store/       STORE app (cliente)
apps/admin/       ADMIN panel (privado, NL-06)
services/api/     NOX & LUX API / backend (NL-03)
packages/shared/  Tipos compartidos (fuente de verdad tipada)
```

Monorepo npm (workspaces). Las dependencias se instalan desde la raíz.

## Requisitos

- Node.js 20+
- npm

## Instalación y desarrollo

```bash
npm install
npm run dev:store   # servidor de desarrollo del Store (http://localhost:5173)
npm run dev:admin   # servidor de desarrollo del Admin (http://localhost:5174)
npm run dev:api     # backend NestJS (watch, http://localhost:3000/api)
```

> El Admin autentica contra la API. Sin backend/PostgreSQL, usa el fallback local
> de demostración (`VITE_AUTH_MODE=dev`, `.env` del Admin) — **solo desarrollo /
> nunca en producción** (ver SECURITY_MODEL.md §2.1).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev:store` | Servidor de desarrollo del Store con HMR |
| `npm run dev:admin` | Servidor de desarrollo del Admin con HMR (5174) |
| `npm run dev:api` | Arranca el backend NestJS en modo desarrollo (watch) |
| `npm run build:store` | Compila TS y genera el bundle del Store (`apps/store/dist`) |
| `npm run build:admin` | Compila TS y genera el bundle del Admin (`apps/admin/dist`) |
| `npm run lint` | Lint (oxlint) en apps/services/packages |
| `npm run test` | Pruebas (una ejecución) en todos los workspaces |
| `npm run test:store` | Pruebas del Store |
| `npm run test:admin` | Pruebas del Admin |
| `npm run test:api` | Pruebas unitarias del API (jest) |
| `npm run test:e2e --workspace @nox-lux/api` | Pruebas e2e del API (supertest) |
| `npm run prisma:migrate --workspace @nox-lux/api` | Aplica migraciones Prisma (dev) |
| `npm run prisma:seed --workspace @nox-lux/api` | Puebla la BD (catálogo + RBAC) |
| `npm run prisma:studio --workspace @nox-lux/api` | Abre Prisma Studio (visualizar BD) |

## Configuración

Copia `apps/store/.env.example` a `.env` y completa los valores. `.env` está en
`.gitignore`. Para el Admin, copia `apps/admin/.env.example` a `.env` y define
`VITE_API_URL` y `VITE_AUTH_MODE` (`api` o `dev`). Para el backend, copia
`services/api/.env.example` a `.env` y completa `DATABASE_URL`, `API_PORT`,
`CORS_ORIGINS` y los secretos de auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
(generados en `.env` local) y `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`
(credenciales reales del PO; el callback debe autorizarse en Google Cloud
Console, p. ej. `http://localhost:3000/api/auth/google/callback`).

**Base de datos (desarrollo):** levanta PostgreSQL con
`docker compose -f services/api/docker-compose.yml up -d` y luego aplica
`npm run prisma:migrate` + `npm run prisma:seed` (workspace `@nox-lux/api`).
Sin servidor, los tests se ejecutan con mocks.

## Documentación

La documentación viva del proyecto está en `docs/`. Consulta
`PROJECT_STATUS.md` para el estado actual y `docs/04-development/CHANGELOG.md`
para el historial.

## Estado

Monorepo activo **en versión 0.13.0**. Ecosistema de tres sistemas operativos:
- **Store** — comprador: catálogo desde la API, checkout (total server-side +
  WhatsApp), **cuenta de comprador** (registro/login), historial de pedidos y
  "Contact Us" (NL-11/13).
- **Admin Panel** — operación privada con login JWT contra la API: productos,
  inventario, media, pedidos, **usuarios** y **tickets de soporte** (NL-06..13).
- **NOX & LUX API** — fuente de verdad (NestJS + Prisma 7 + PostgreSQL + Argon2id):
  auth/RBAC dual (Google + contraseña), catálogo, inventario, media, pedidos,
  usuarios, tickets y auditoría.

**Bloque actual del roadmap:** **NL-13 — Staging**: recorte funcional
**completado ✅ (0.13.0: F-29/F-30/F-31)**; la provisión/validación real de
infraestructura (Hetzner @ Ashburn, PostgreSQL auto-gestionada) queda
**pendiente** (NL-13/14). Ver `PROJECT_STATUS.md` y
`docs/06-release/RELEASE_PLAN.md`.