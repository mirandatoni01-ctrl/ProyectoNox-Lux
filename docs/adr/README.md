# Registro de Decisiones de Arquitectura (ADR) — NOX & LUX

Índice y mapa de numeración de los ADR. Consultar este documento como fuente de
verdad de la nomenclatura.

## Nueva directiva aprobada 2026-08-28 (NL-00)

La directiva reorienta el proyecto a un ecosistema de **tres sistemas separados**:
STORE (app de cliente), ADMIN (panel privado) y BACKEND propio (fuente central de
verdad con PostgreSQL). Para reservar `ADR-NL-001..007` a esta nueva arquitectura,
los ADR existentes relativos al MVP (stack, persistencia, auth local, móvil,
imágenes, WhatsApp) fueron **renumerados a `ADR-NL-011..016`**.

## Mapa de renumeración

| Antiguo | Nuevo | Título |
|---|---|---|
| ADR-NL-001 | ADR-NL-011 | Stack: Vite + React + TS + Tailwind |
| ADR-NL-002 | ADR-NL-012 | Persistencia local-first con port (reclasificado a fallback/desarrollo) |
| ADR-NL-003 | ADR-NL-013 | Autenticación por puerto (supersedido en producción) |
| ADR-NL-004 | ADR-NL-014 | Estrategia móvil: Capacitor (rige el Store) |
| ADR-NL-005 | ADR-NL-015 | Imágenes: local en MVP (migrar a Object Storage) |
| ADR-NL-006 | ADR-NL-016 | Número WhatsApp en env |

## ADR de la nueva arquitectura (NL-00)

| ID | Estado | Título |
|---|---|---|
| ADR-NL-001 | VALIDADO (NL-03/NL-05) | Backend propio (fuente de verdad) |
| ADR-NL-002 | VALIDADO (NL-06) | Separación total Store / Admin |
| ADR-NL-003 | APROBADO (dirección) | Fuente central de verdad (cliente subordinado al API) |
| ADR-NL-004 | VALIDADO (NL-03) | Arquitectura backend inicial: Modular Monolith |
| ADR-NL-005 | VALIDADO (NL-04) | Base de datos: PostgreSQL (Prisma 7; modelo completo implementado + migración + seed) |
| ADR-NL-006 | VALIDADO (NL-06) | Administración: panel independiente y privado |
| ADR-NL-007 | ACEPTADO (NL-13) | Proveedor de infraestructura: **Hetzner @ Ashburn** |
| ADR-NL-INFRA-001 | ACEPTADO (NL-13) | Selección de proveedor de infraestructura (detalle) |

## ADR estructurales (implementados tras NL-00)

| ID | Estado | Título |
|---|---|---|
| ADR-NL-017 | IMPLEMENTADO (NL-01/NL-02) | Monorepo con npm workspaces |
| ADR-NL-018 | IMPLEMENTADO (NL-05) | Autenticación dual: Google OAuth + contraseña (sesiones JWT) |
| ADR-NL-019 | IMPLEMENTADO (NL-11) | Store consume API (catálogo + pedidos REST; local → offline) |
| ADR-NL-020 | IMPLEMENTADO (NL-12) | Rate limiting por IP (express-rate-limit) + CSP en apps cliente |

Los ADR 001-006 están **aprobados como dirección**. ADR-NL-001, 004 y 005
quedan **validados en NL-03/NL-04** (backend NestJS + Modular Monolith + modelo
PostgreSQL completo con Prisma 7). ADR-NL-018 (auth dual) queda **implementado
en NL-05**. ADR-NL-002 y ADR-NL-006 (separación Store/Admin y Admin externo)
quedan **validados en NL-06** (panel `apps/admin` operativo con sesión contra la
API; el admin integrado y el selector de rol del Store fueron eliminados).
ADR-NL-003 se valida en **NL-11** (**IMPLEMENTADO EN NL-11**: el Store consume
catálogo/pedidos del API con caché offline; ver ADR-NL-019). ADR-NL-007 e
INFRA-001 quedan **aceptados en NL-13** (decisión del PO: **Hetzner, región
Ashburn, PostgreSQL auto-gestionada**) — ver el itinerario NL-13/14 para el
aprovisionamiento real.
(ADR-NL-005: migración+seed generados; aplicar contra servidor PostgreSQL real).
