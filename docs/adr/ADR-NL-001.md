# ADR-NL-001 — Backend propio (fuente central de verdad)

**Estado:** VALIDADO (NL-03/NL-05) — backend construido; auth en NL-05
**Fecha:** 2026-08-28
**Contexto:** Supersede al ADR-NL-012 (persistencia local-first) en lo que
respecta a la fuente de datos.

## Contexto
El MVP (NL-01/NL-02) funcionaba como Store + Admin unificados con persistencia
local en IndexedDB (Dexie). El cliente era la fuente de verdad. La directiva
aprobada establece que el proyecto debe disponer de un **backend propio** que
centralice API, autenticación, autorización, productos, inventario, pedidos,
clientes, media y auditoría.

> **Nota NL-05 (auth dual):** la autenticación aprobada combina **Google OAuth**
> (proveedor de identidad) **y** contraseña con Argon2id, unificadas en sesiones
> JWT (access + refresh en BD). Ver ADR-NL-018 y SECURITY_MODEL.md.

## Problema
Determinar quién es la fuente de verdad del sistema y cómo se exponen los datos
a los distintos clientes.

## Opciones consideradas
- **A)** Backend propio (API) como fuente de verdad; Store y Admin consumen la
  misma API. *(elegida)*
- **B)** Mantener fuentes de verdad locales independientes (IndexedDB) — no
  permite datos compartidos ni operación real de un negocio.
- **C)** Backend de terceros / BaaS — limita control sobre inventario, pedidos,
  auditoría y autorización.

## Decisión propuesta
Construir un **backend propio** (API REST) que sea la única fuente de verdad y
exponga clientes Store y Admin. Stack candidato (validable en NL-03):
Node.js + TypeScript + NestJS + Prisma + Argon2id + REST/OpenAPI + Zod.

## Ventajas
- Datos compartidos y coherentes (inventario, pedidos, clientes).
- Autorización y auditoría centralizadas.
- Control completo del modelo de negocio.

## Desventajas / costes
- Nuevo sistema a construir desde cero (mayor esfuerzo del roadmap).
- Requiere infraestructura y despliegue.

## Impacto técnico
Se crea `services/api` dentro del monorepo (NL-03+). El Store migra sus llamadas
locales a llamadas HTTP (NL-11). La persistencia local queda como fallback de
desarrollo/offline (ADR-NL-012 reclasificado).

## Impacto en producción
Es el **requisito habilitador** de toda la operación real del negocio.

## Riesgos
Coste de re-ingeniería; regresión funcional temporal durante la migración.
Mitigado por transición incremental documentada en MIGRATION_STRATEGY.md.
