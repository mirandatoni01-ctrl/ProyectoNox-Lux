# SYSTEM_BOUNDARIES — NOX & LUX

**Versión:** 1.0
**Fecha:** 2026-08-28
**Relacionados:** ARCHITECTURE_BLUEPRINT_V1.md, ADR-NL-001/002/003, ADR-NL-004.

## Propósito

Definir los límites (boundaries) entre los sistemas del ecosistema y entre los
módulos del backend, para evitar acoplamiento indebido y mantener la
responsabilidad clara de cada pieza.

---

## 1. Límites entre sistemas

| Sistema | Contrato con el ecosistema | Fuente de datos | Acceso |
|---|---|---|---|
| STORE APP | Llamadas REST al API (catálogo, carrito, pedido) | API (caché local no autoritativa) | Público |
| ADMIN PANEL | Llamadas REST al API (CRUD protegido) | API | Privado, autenticado + RBAC |
| NOX & LUX API | Contrato REST/OpenAPI | PostgreSQL (verdad) + Object Storage + Audit | Interno/externo vía TLS |

**Regla:** STORE y ADMIN **nunca** acceden directamente a la base de datos ni
comparten persistencia local como verdad. Todo pasa por el API.

### Comunicación
- STORE ↔ API: HTTPS público, endpoint `/api/v1/*` (partes públicas).
- ADMIN ↔ API: HTTPS privado (o restringido por red/VPN o IP) + JWT, `/api/v1/*`
  (partes administrativas protegidas por permisos).
- API ↔ PostgreSQL: pool interno (no expuesto).
- API ↔ Object Storage: credenciales de servicio (no expuestas a clientes).

---

## 2. Límites de módulos del backend (Modular Monolith, ADR-NL-004)

Cada módulo expone una **API interna acotada** (vía NestJS modules y DI) y NO
accede a los repositorios/tablas de otro módulo directamente; solo mediante su
fachada/servicio. La base de datos es **compartida a nivel de esquema** pero cada
módulo es dueño (owner) de sus tablas.

| Módulo | Tablas (owner) | Expone a clientes | Depende de |
|---|---|---|---|
| Auth | USERS (parcial), sesiones/tokens | login/refresh, token validate | Users |
| Users/Access | USERS, ROLES, PERMISSIONS, USER_ROLES | gestión usuarios/roles/permisos | Auth |
| Products | PRODUCTS, PRODUCT_VARIANTS | CRUD productos/variantes | Media (imágenes), Audit |
| Inventory | INVENTORY | stock, movimientos | Products |
| Media | PRODUCT_IMAGES, referencia a Object Storage | subida/consulta imágenes | Object Storage |
| Customers | CUSTOMERS | CRUD/consulta clientes | Auth (opcional) |
| Orders | ORDERS, ORDER_ITEMS | pedidos, estados | Inventory, Customers, WhatsApp/Notify |
| Audit | AUDIT_LOGS | escribir/consultar registros | — |

**Regla de dependencia:** permitido un sentido descendente
(Auth → acceso → dominios → audit). Prohibido que un módulo lea tablas de otro
salvo por su servicio/fachada; las deudas se saldan con eventos internos o
llamadas a servicios.

---

## 3. Fronteras de datos (staged)

Los datos del MVP (`Product`, `ProductVariant`, `CartItem`, Dexie) se
**mapean** a las entidades PostgreSQL del API:

| MVP (cliente) | API (PostgreSQL) | Nota |
|---|---|---|
| Product.id | PRODUCTS.id | se mantiene |
| Product.category | PRODUCTS.category | se mantiene |
| Product.basePrice | PRODUCTS.base_price | decimal |
| Product.material | (derivado a variantes) | los materiales pasan a PRODUCT_VARIANTS |
| Product.imageUrl | PRODUCT_IMAGES + Object Storage | refactor completo (ADR-NL-015) |
| ProductVariant (sin id/sku) | PRODUCT_VARIANTS.id, sku | se normaliza |
| CartItem (id compuesto) | ORDER_ITEMS (variant_id real) | se normaliza |

---

## 4. Reglas de condición de borde (edge rules)

- **Nunca** guardar secretos en el cliente (solo se expone lo público).
- El API valida y autoriza **todas** las entradas (Zod) y comprueba permisos en
  cada operación administrativa.
- La caché local del Store nunca se trata como autoritativa para stock/pedidos.
- Cambios de esquema PostgreSQL se gestionan con migraciones Prisma
  (versionadas), no con ediciones manuales.

---

*Mantener este documento en sintonía con ARCHITECTURE_BLUEPRINT_V1.md al
evolucionar los módulos.*
