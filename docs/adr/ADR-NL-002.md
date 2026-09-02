# ADR-NL-002 — Separación total Store / Admin

**Estado:** VALIDADO (NL-06)
**Fecha:** 2026-08-28 · **Validado:** 2026-08-29

## Contexto
El MVP integraba en un único `App.tsx` la experiencia de cliente **y** un panel
administrador controlado por un botón de rol (CUSTOMER/ADMIN). Esta mezcla es un
riesgo de seguridad y de UX.

## Problema
Separar la experiencia del cliente de la operación administrativa sin perder
funcionalidad.

## Opciones consideradas
- **A)** Dos aplicaciones independientes que comparten modelo de datos vía API y
  una lib de design/dominio compartida. *(elegida)*
- **B)** Interfaces/temas dentro de una misma app — no aísla el riesgo de
  autorización.
- **C)** Uno solo (client app) — inviable para operar el negocio.

## Decisión propuesta
Separar en **Store App** (solo cliente) y **Admin Panel** (sistema separado y
privado), ambas hablando con el backend (ADR-NL-001).

## Ventajas
- Aislamiento de responsabilidades y de superficie de ataque.
- Ciclos de despliegue independientes.
- Experiencias optimizadas por rol.

## Desventajas
- Duplicidad inicial de infraestructura de UI (mitigada con paquete compartido).

## Impacto técnico
Dentro del monorepo: `apps/store` y `apps/admin` (NL-02). El panel admin
integrado en el Store se elimina y reconstruye en el Admin (NL-06).

## Validación (NL-06)
- `apps/admin` operativo: react-router v7, login con sesión contra la API
  (access en memoria + refresh en sessionStorage, rotación/revocación) y módulo
  de productos compartiendo la IndexedDB `nox-lux-db` con el Store.
- `apps/store` quedó como app de comprador pura: retirados el selector de rol
  (cierre de SECURITY_AUDIT S-01), pestañas `admin_products`/`admin_add`,
  formulario de alta, modal de edición y handlers administrativos.
- Builds y tests verdes: Store 9/9, Admin 23/23, API 26/26 + e2e 7/7.

## Riesgos
Regresión funcional temporal (el admin integrado se elimina antes de que el
Admin externo esté listo) — transición incremental en MIGRATION_STRATEGY.md.
