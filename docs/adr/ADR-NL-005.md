# ADR-NL-005 — Base de datos: PostgreSQL

**Estado:** VALIDADO (NL-04) — modelo completo implementado
**Fecha:** 2026-08-28

## Contexto
La directiva establece que el backend cuenta con una base de datos relacional
como fuente de verdad (ADR-NL-001/003). El MVP usaba IndexedDB en el cliente.

## Problema
Elegir el motor de base de datos del backend.

## Opciones consideradas
- **A)** **PostgreSQL**: relacional, maduro, transaccional, extensible, soportado
  por Prisma y por los proveedores finalistas. *(elegida)*
- **B)** MySQL/MariaDB: sólido pero con menos extensibilidad que Postgres.
- **C)** MongoDB/NoSQL: flexibilidad de esquema pero menor integridad relacional
  para inventario/pedidos/auditoría.

## Decisión propuesta
**PostgreSQL** como único motor de datos canónico. Acceso vía **Prisma ORM**
(candidato, validable en NL-03), con migraciones versionadas.

## Ventajas
- Integridad referencial y transacciones ACID (crítico para pedidos/inventario).
- Soporte nativo en Hetzner y DigitalOcean (gestionado o en instancia).
- Ecosistema y herramientas maduras.

## Desventajas
- Ajuste fino de rendimiento requiere experiencia (aceptable en esta escala).

## Impacto técnico
Modelo de datos definido en `DATA_MODEL.md` (USERS, ROLES, PERMISSIONS,
PRODUCTS, PRODUCT_VARIANTS, PRODUCT_IMAGES, INVENTORY, CUSTOMERS, ORDERS,
ORDER_ITEMS, AUDIT_LOGS). Aplicación en NL-04.

## Riesgos
Semillas/volcado inicial y reglas de negocio aún a definir (ver decisiones
pendientes en blueprint).
