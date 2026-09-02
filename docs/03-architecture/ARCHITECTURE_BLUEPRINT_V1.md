# NOX & LUX — Architecture Blueprint v1.0

**Versión:** 1.0
**Fecha:** 2026-08-28
**Estado:** APROBADO como dirección (NL-00)
**Alcance:** Ecosistema completo STORE / ADMIN / BACKEND.
**Aplica:** a partir del bloque NL-01. No modifica todavía el código del MVP;
documenta el objetivo arquitectónico y el plan de migración.

---

## 1. Resumen ejecutivo

El proyecto evoluciona de una única web app con persistencia local (IndexedDB) a
un **ecosistema de tres sistemas separados** con un **backend propio como fuente
central de verdad**:

| Sistema | Rol | Audiencia | Publicación |
|---|---|---|---|
| **STORE APP** | Experiencia de cliente (catálogo, carrito, pedido) | Clientes | PWA/web + Android (Capacitor) |
| **ADMIN PANEL** | Operación privada (productos, inventario, pedidos, clientes, media, usuarios) | Equipo interno | Web privada (subdominio/URL propio) |
| **NOX & LUX API** | Backend REST propio, fuente de verdad | Store + Admin | Instancia servidor (VPS) |

Decisones clave registradas en los ADR `001-007` e `INFRA-001`.

---

## 2. Principios de arquitectura

1. **API como fuente central de verdad** (ADR-NL-003). Ningún dato canónico vive
   solo en el cliente. La persistencia local es caché/fallback.
2. **Separación total Store / Admin** (ADR-NL-002). Sin mezcla de roles en un
   mismo binario.
3. **Backend propio** (ADR-NL-001): control de datos, autorización y auditoría
   centralizados.
4. **Modular Monolith** (ADR-NL-004): un despliegue, dominios bien delimitados,
   extraíbles a microservicios si es necesario luego.
5. **Una única base de datos PostgreSQL** (ADR-NL-005).
6. **Seguridad por defecto**: hashing de contraseñas (Argon2id), JWT con
   expiración, control de acceso por roles/permisos, cifrado en tránsito (TLS).
7. **Chica, simple, evolutiva**: infraestructura mínima viable inicial cuya
   complejidad crece con el negocio.

---

## 3. Vista de sistemas (contexto)

```
                    ┌─────────────────┐
                    │   CLIENTES      │
                    │   STORE APP     │
                    └────────┬────────┘
                             │ HTTPS
                             ▼
                  ┌──────────────────────┐
                  │   NOX & LUX API      │  (NestJS + Prisma)
                  │   FUENTE DE VERDAD   │
                  └──────────┬───────────┘
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
        PostgreSQL        Storage          Audit
                             ▲
                    ┌────────┴────────┐
                    │ ADMIN PANEL     │
                    │ PRIVADO         │
                    └─────────────────┘
```

---

## 4. Componentes del sistema

### 4.1 STORE APP
- **Tecnología:** React 19 + TypeScript + Vite 7 + Tailwind 4 (vigencia del
  ADR-NL-011), Capacitor para Android (ADR-NL-014).
- **Responsabilidad:** catálogo, búsqueda/filtros, carrito, checkout/pedido vía
  API, contacto WhatsApp.
- **Fuente de datos:** API (REST). Caché/offline local subordinada (fallback).
- **Persistencia local:** conservada solo como fallback de desarrollo/offline
  (ADR-NL-012 reclasificado).

### 4.2 ADMIN PANEL
- **Tecnología:** React + TypeScript + Vite (SPA independiente), design
  compartida vía paquete común.
- **Responsabilidad:** autenticación y gestión de productos, variantes,
  inventario, pedidos, clientes, media, y usuarios/roles/permisos.
- **Acceso:** privado, con autorización real basada en tokens y permisos
  (ADR-NL-006, SECURITY_MODEL.md).

### 4.3 NOX & LUX API (Backend)
- **Tecnología (dirección):** Node.js + TypeScript + NestJS + Prisma +
  Argon2id + REST/OpenAPI + Zod.
- **Módulos (ADR-NL-004):** Auth, Usuarios/Roles/Permisos, Productos,
  Variantes, Media, Inventario, Pedidos, Clientes, Auditoría.
- **Contratos:** API REST documentada con OpenAPI; versionamiento `/api/v1`.

---

## 5. Vista de datos (resumen)

PostgreSQL (ADR-NL-005). Entidades principales — detalle en `DATA_MODEL.md`:

`USERS`, `ROLES`, `PERMISSIONS`, `USER_ROLES`,
`PRODUCTS`, `PRODUCT_VARIANTS`, `PRODUCT_IMAGES`, `INVENTORY`,
`CUSTOMERS`, `ORDERS`, `ORDER_ITEMS`, `AUDIT_LOGS`.

Flujo pedido de alto nivel: `CUSTOMER -> ORDER -> ORDER_ITEMS (variantId) ->
INVENTORY (stock) -> AUDIT_LOGS`.

---

## 6. Seguridad (resumen)

Detalle en `SECURITY_MODEL.md`. Resumen:
- Contraseñas con Argon2id (criptográfico, bcrypt-like pero moderno).
- Sesión/autorización con JWT firmado (access + refresh), expiración corta.
- RBAC: `ROLES` + `PERMISSIONS`; el Admin comprueba permisos en cada operación.
- Cifrado en tránsito (TLS/HTTPS) en todos los entornos no locales.
- Auditoría: `AUDIT_LOGS` para acciones administrativas sensibles.
- Secretos por variables de entorno; `.env` nunca versionado.

---

## 7. Infraestructura y despliegue (resumen)

Detalle en `DEPLOYMENT_STRATEGY.md`. Proveedor **pendiente** (ADR-NL-007 /
INFRA-001): finalistas **Hetzner Cloud** y **DigitalOcean**. Entornos:
- **local / dev:** por CI+dev en la máquina del desarrollador.
- **staging (NL-13):** réplica en la nube del proveedor elegido (VPS: API +
  PostgreSQL; Object Storage para imágenes).
- **producción (NL-14):** VPS del proveedor; Store/Admin servidos como SPA
  estática + API y BD.

---

## 8. Estrategia de migración (resumen)

Detalle en `MIGRATION_STRATEGY.md`. Clasificación del código MVP y orden:
1. Restablecer estructura monorepo (NL-01/NL-02).
2. Backend + modelo de datos (NL-03/NL-04).
3. Auth y acceso admin (NL-05/NL-06).
4. Productos, inventario, media, pedidos (NL-07..NL-10).
5. Store consume la API y se retira la persistencia local como verdad
   (NL-11).
6. Calidad/seguridad (NL-12), staging (NL-13), producción (NL-14).

Reclasificación del MVP:
- **CONSERVAR:** tipos, constantes, catálogo/carrito (Store), identidad visual.
- **MIGRAR a API:** repositorios (port → REST), WhatsApp, imágenes → object
  storage, modelo de datos → PostgreSQL, INITIAL_PRODUCTS → seed.
- **DEPRECADA / eliminar del Store:** selector de rol y panel admin integrado.
- **REFACTORIZAR:** monolito `App.tsx` → separar Store/Admin.
- **NO TOCAR:** `esto no tiene que ver con el proyecto no tocar.txt`.

---

## 9. Decisiones de arquitectura (ADR)

| ID | Estado | Decisión |
|---|---|---|
| ADR-NL-001 | Dirección | Backend propio (fuente de verdad) |
| ADR-NL-002 | Dirección | Separación Store/Admin |
| ADR-NL-003 | Dirección | Fuente central de verdad |
| ADR-NL-004 | Dirección | Modular Monolith (NestJS) |
| ADR-NL-005 | Dirección | PostgreSQL |
| ADR-NL-006 | Dirección | Admin panel independiente/privado |
| ADR-NL-007 | Pendiente | Proveedor infraestructura |
| ADR-NL-INFRA-001 | Pendiente | Detalle de proveedor infraestructura |
| ADR-NL-011..016 | Aprobados/renumerados | Decisiones históricas del MVP |

Subdecisiones de implementación (backend stack en detalle) se materializarán en
sus bloques (NL-03/NL-04) como ADR candidatos a validar.

---

## 10. Riesgos y supuestos

1. La decisión de infraestructura (ADR-NL-007) bloquea staging/producción.
2. Reglas de negocio de pedidos/inventario (reserva de stock, descuentos,
   estados, cancelación) **aún no definidas** por el PO → pendientes antes de
   NL-08/NL-10.
3. Coste de re-ingeniería al construir el backend desde cero.
4. Regresión funcional temporal (se elimina el admin integrado antes de tener el
   externo) — mitigado por transición incremental.
5. Imágenes requieren Object Storage (depende de ADR-NL-007/infra).

## 11. Próximos bloques (roadmap propuesto)

Detalle en `MIGRATION_STRATEGY.md` / `docs/06-release/RELEASE_PLAN.md`.

`NL-00 redirección` → `NL-01 arquitectura foundation` → `NL-02 estructura repo
(monorepo)` → `NL-03 backend foundation` → `NL-04 modelo/BD` → `NL-05 auth &
admin access` → `NL-06 admin panel` → `NL-07 productos/variantes` →
`NL-08 inventario` → `NL-09 media` → `NL-10 pedidos & WhatsApp` →
`NL-11 store consume API` → `NL-12 testing & security` → `NL-13 staging` →
`NL-14 producción`.

---

*Documento maestro de arquitectura. Complementado por SYSTEM_BOUNDARIES.md,
SECURITY_MODEL.md, DEPLOYMENT_STRATEGY.md, MIGRATION_STRATEGY.md y
DATA_MODEL.md.*
