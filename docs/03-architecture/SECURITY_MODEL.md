# SECURITY_MODEL — NOX & LUX

**Versión:** 1.2
**Fecha:** 2026-08-28 (v1.0) · 2026-08-31 (v1.1, NL-12) · 2026-09-02 (v1.2, NL-13/recorte)
**Relacionados:** ARCHITECTURE_BLUEPRINT_V1.md, ADR-NL-001/006/020, SECURITY_AUDIT.md.

## Propósito

Definir el modelo de seguridad del ecosistema. Este documento **reemplaza** la
apuesta del MVP (rol por UI) y establece autenticación y autorización reales de
extremo a extremo.

---

## 1. Principios

1. **Autenticación real** con contraseña y sesión segura (nada de botón de rol).
2. **Autorización basada en roles y permisos (RBAC)** en el backend.
3. **Secretos fuera del código** (variables de entorno, `.env` nunca versionado).
4. **Cifrado en tránsito** (TLS) en todo entorno no local.
5. **Mínimos privilegios**: cada sistema solo accede a lo necesario.
6. **Auditoría** de acciones sensibles.

---

## 2. Autenticación (back-end)

>`NL-05`: modelo **dual** — Google OAuth + contraseña (ADR-NL-018). Google es el
>proveedor de identidad; los roles/permisos siempre provienen del `User` de
>nuestra BD (alta gestionada por Admin).

- Alta de usuarios gestionada por el Admin (nunca auto-registro público; Google
  **no** crea usuarios automáticamente, solo autentica el email).
- Contraseñas con **Argon2id** (resistente a fuerza bruta/GPU), nunca en claro.
- **Login por contraseña**: `POST /api/auth/login` → valida credenciales con
  Argon2id y emite sesión.
- **Login con Google OAuth 2.0** (Authorization Code + PKCE): valida la
  identidad/email del proveedor y lo vincula al `User` existente en BD.
- Sesión con **JWT firmado**: `access_token` (corto, p. ej. 15-30 min) +
  `refresh_token` (rotación, persistido como hash en la tabla `RefreshToken`), en
  lugar de almacenarse sin control en el cliente.
- OpenID/OAuth adicional solo si se requiere otro proveedor (fuera de alcance).

### 2.1 Sesión del Admin Panel (NL-06)

>Decisión de sesión del cliente Admin (ADR-NL-006): mínimo de almacenamiento.

- **Access token: SOLO en memoria** (`tokenStorage`, nunca localStorage/
  sessionStorage) — no sobrevive a recargas voluntarias, reduce exposición XSS.
- **Refresh token: en `sessionStorage`** — se purga al cerrar la pestaña;
  permite restaurar la sesión al recargar (rotación con revocación del anterior).
- `GET /api/auth/me` expone `{ id, email, roles, permissions }` para RBAC en la
  UI; la **autorización real** de cada operación la aplica el backend (NL-07+).
- **`DevAuthRepository` es SOLO desarrollo**: fallback local cuando no hay
  backend (`VITE_AUTH_MODE=dev`). Emite tokens de demostración, NO valida nada.
  **Queda prohibido en producción** (CORS + build `api` obligatorio en
  staging/prod; SECURITY_AUDIT S-01 cerrada, S-02 mitigada). Desde NL-12 el
  build de producción de Admin **fuerza** `VITE_AUTH_MODE=api` (throw si no).

### 2.2 Rotación de refresh + detección de replay (NL-12)

- El refresh token se almacena como hash (SHA-256) en `RefreshToken` con
  rotación: cada `POST /api/auth/refresh` revoca el anterior y emite uno nuevo.
- **Replay**: reusar un refresh ya rotado/revocado es un indicio de robo → se
  revoca **toda la familia** de refresh activos del usuario y se responde **401**
  ("Sesión revocada: se detectó el reuso de un token").
- Alta de usuarios (`POST /api/auth/register`) exige **SUPER_ADMIN +
  `usuarios:gestionar`** (p. ej. un ADMIN con gestión de usuarios no puede
  registrarlos él solo a menos que tenga ese permiso).

### 2.3 Sesión del comprador / guest (Store, NL-13/recorte)

- **Store usa `sessionStorage`** (`noxlux.accessToken`, **distinta** a la del
  Admin): sesión por pestaña, se purga al cerrarla; no se persiste el token en
  `localStorage` (menos superficie XSS). `me()` alimenta el perfil/UI; la
  autorización real la aplica el backend.
- **`POST /auth/register/customer` es público** y **siempre** crea el rol
  `CUSTOMER` (sin permisos de panel). La alta de **operadores/ADMIN** sigue
  protegida (§2.2, `usuarios:gestionar`).
- **`OptionalJwtAuthGuard`** (`orders` y `tickets`): la compra y el "Contact Us"
  **funcionan como invitado** (payload anónimo) y **se enriquecen** con `userId`
  cuando llega un JWT válido; un JWT **inválido/vencido se rechaza** (nunca se
  degrada silenciosamente a anónimo para no perder trazabilidad del autor).
- **`me()`** expone `fullName`/`phone`/`provider` del cliente para prefill del
  checkout y perfil; `provider` distingue contraseña (`email`) vs **Google OAuth**
  (`google`). `changePassword` rechaza cuentas Google sin contraseña
  (placeholder interno `GOOGLE_PLACEHOLDER_PREFIX`) para no sobrescribir la
  __identidad Google.__
- Los tickets creados por un comprador logueado enlazan `contactTicket.userId`
  (onDelete **SetNull**) para trazabilidad; los de invitado quedan anónimos.

## 3. Autorización (RBAC)

- Entidades `ROLES` y `PERMISSIONS` (tabla de mapeo `USER_ROLES`).
- Permisos por acción administrativa (p. ej. `productos:crear`,
  `inventario:editar`, `pedidos:ver`, `usuarios:gestionar`).
- El backend comprueba el permiso en **cada** operación administrativa, nunca en
  el cliente.
- **NL-13/recorte:** rol `CUSTOMER` (comprador del Store, **sin** permisos de
  panel) y permisos de soporte `usuarios:ver`/`usuarios:gestionar` y
  `tickets:ver`/`tickets:gestionar`. El rol `ADMIN` incluye usuarios/tickets
  (`usuarios:ver`, `tickets:*`) pero **excluye** `usuarios:gestionar` y
  `auditoria:ver` (reservados a SUPER_ADMIN).

| Rol típico | Acceso |
|---|---|
| SUPER_ADMIN | Todo (usuarios, roles, permisos, seguridad, auditoría) |
| ADMIN | Operación completa (productos, inventario, pedidos, clientes, media, usuarios:ver, tickets) |
| CUSTOMER | Compra en el Store (catálogo, pedido, historial propio, tickets propios) — sin panel |
| (futuros) VENDEDOR/GERENTE | Subconjuntos definidos por permisos |

## 4. Protección de datos

- **Clientes Store**: solo datos públicos (catálogo). El pedido envía datos
  mínimos de contacto; el API es el dueño de `CUSTOMERS`/`ORDERS`.
- **Validation de entradas** en el backend (Zod) para evitar inyección/XSS
  (SQL inyectado se evita además con Prisma/parámetros). Desde NL-12 los schemas
  de auth son **estrictos** (`.strict()`): campos extra → **400** (mass-assignment),
  y el `ValidationPipe` global usa `forbidNonWhitelisted`.
- **CORS**: restringido a los orígenes Store/Admin conocidos (`CORS_ORIGINS`,
  default `http://localhost:5173,http://localhost:5174`; validados por fail-fast:
  nunca `*`, deben ser http(s)).
- **Headers de seguridad**: `helmet()` (incluye `nosniff`, CSP `default-src 'self'`,
  `frame-ancestors 'none'`); body JSON limitado a 1 MB; filtro global de errores
  sin leaks de stack/Prisma.
- **Rate limiting por IP** (`express-rate-limit`, ADR-NL-020): global 300/min
  (prod) y por ruta `POST /api/auth/login` 5/min, `/api/auth/refresh` 10/min,
  `POST /api/orders` 10/min → **429**. Anti fuerza bruta/abuso; por memoria
  (single-instance; store compartido → NL-13/14).
- **Media por magic bytes** (NL-12): además de la whitelist de mimes, se verifica
  la **signatura real** del blob (jpeg/png/webp/gif) → rechaza SVG y contenido
  disfrazado → 400.
- **Config fail-fast** (NL-12): secretos ausentes/ejemplo/débiles (<32 en prod),
  `JWT_ACCESS === JWT_REFRESH` o CORS inválido abortan el boot.

## 5. Alma/almacenamiento de imágenes

- El acceso a imágenes pasa por el API (firmado/ACL) o por URLs firmadas del
  Object Storage (ADR-NL-015 migrar a Object Storage). No se usan credenciales en
  el cliente.

## 6. Auditoría

- **Central (desde NL-12)**: `AuditService.record()` / `GET /api/audit` (permiso
  `auditoria:ver`, seed SUPER_ADMIN/ADMIN) lista por action/entity/actor con
  paginación acotada. Las escrituras sensibles (auth login/logout/refresh/
  register/failed, inventory, media, orders con ip/user-agent, products CRUD)
  registran una entrada `AUDIT_LOGS` (quién + qué + cuándo + desde dónde).
- **Best-effort**: un fallo de escritura del log no rompe el flujo de negocio
  (se loguea `warn`).
- Logs estructurados; el teléfono en logs de WhatsApp va **enmascarado**
  (PII); retención definida en NL-12.

## 7. Mapa MVP → objetivo

| Práctica MVP (deficiente) | Práctica objetivo |
|---|---|
| Rol conmutado por botón en la UI | RBAC real en el backend (ADR-NL-013 supersedido) |
| Sin contraseñas | Argon2id + JWT + Google OAuth (ADR-NL-018) |
| Cliente con datos canónicos | API como fuente de verdad (ADR-NL-003) |
| Número al descubierto en código (histórico) | Variables de entorno (ADR-NL-016) |
| URLs externas de imagen | Object Storage privado + URLs firmadas |
| Endpoints abiertos / sin límites | Rate limiting + paginación acotada + fail-fast (NL-12) |
| Sin trazabilidad | Auditoría central `GET /api/audit` (NL-12) |
| Refresh sin control | Rotación + revocación + replay → familia revocada (NL-12) |

## 8. Estado de decisiones pendientes (NL-12)

- Política de contraseñas: mín. 12 caracteres en alta (validado por zod).
- Intentos de login / bloqueo: **rate limiting por IP** implementado (429);
  bloqueo de cuenta por usuario queda como futura política.
- ¿Self-signup de clientes o solo por admin? (por defecto: no self-signup).
- Retención de audit logs y requisitos legales (RGPD/ARCO si aplica): pendiente
  de definir retención concreta.

---

*Consolidar con SECURITY_AUDIT.md; aplicar en bloques NL-05/NL-12.*
