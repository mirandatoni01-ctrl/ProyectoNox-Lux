# ADR-NL-020 — Rate limiting por IP (express-rate-limit) + CSP en apps cliente

**Estado:** IMPLEMENTADO (NL-12)
**Fecha:** 2026-08-31
**Contexto:** NL-12 endurece el backend (S-11/S-12/S-13) y las apps cliente
(CSP). Este ADR fija dos decisiones técnicas concretas: (1) el middleware de
rate limiting elegido tras un fallback real, y (2) cómo se inyecta la CSP en
Store y Admin sin romper el desarrollo local.

## Decisiones propuestas

### 1. Rate limiting por IP con `express-rate-limit`
- **Por qué no `@nestjs/throttler`:** la versión 6.5.0 requerida por NPM tiene
  peer-dependencies `^7||^8||^9||^10||^11` (Nest ≤ 11) y es **incompatible con
  Nest 12**. Se probó el fallback implícito y el arranque falló; mantenerla
  arrastraría advertencias de peer no resueltas y un plugin roto.
- **Elegido:** `express-rate-limit` **^8.7.0** (middleware Express, compatible
  con Nest 12 vía `app.use`). Mide lo mismo (ventana + límite por IP), es
  testeable por instancia de app y cubre el caso de uso (anti fuerza bruta /
  abuso por IP).
- **Configuración (env `THROTTLE_*`):** global 300 req/min (prod) / 3600 (test),
  intervalos por ruta `POST /api/auth/login` 5/min, `/api/auth/refresh` 10/min,
  `POST /api/orders` 10/min, TTL 60s; `skip` para `media-file`, `health` y
  `catalog`. Definida en `configureApp()` (`src/app.setup.ts`) y reutilizada por
  `main.ts` y el e2e de seguridad.
- Se devuelve `429` con cuerpo JSON `{statusCode,message,error}` y headers
  `RateLimit-*` (`standardHeaders:true`).

### 2. CSP en Store y Admin
- **Cómo:** plugin Vite propio (`apply:'build'`) que inyecta
  `<meta http-equiv="Content-Security-Policy">` en el `<head>` **solo en build de
  producción**. En desarrollo **no** se inyecta: el HMR del cliente usa
  evaluadores inline y conexiones del dev server que romperían bajo una CSP
  estricta.
- **Política aplicada:** `default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
  connect-src 'self' <VITE_API_URL>; font-src 'self' data: https:;
  object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`.
  `connect-src` admite el origen del API por build (permite que la app cliente
  consuma el backend sin romper la política).
- **Guard extra Admin (`repositoryFactory.ts`):** en `import.meta.env.PROD` el
  modo de auth debe ser `'api'` (backend real); si no, lanza. Refuerza S-12
  (no enmascarar la identidad con datos embebidos en el bundle).

## Ventajas
- Un middleware sano y compatible con Nest 12 (sin deuda por throttler).
- Reglas de rate limit compartidas entre prod y tests (misma `configureApp`).
- CSP estricta en artefactos publicados sin sacrificar el DX de desarrollo.
- Los clientes solo hablan con `connect-src` al API permitido (reduce exfiltración).

## Desventajas / costes
- La tasa límite es **por IP** en memoria (single-instance): bajo múltiples
  instancias tras un balanceador se necesita un store compartido (Redis) — fuera
  de alcance hasta NL-13/14 (infra).
- CSP con `'unsafe-inline'` en `style-src` es un atenuante menor (los estilos
  inline de Tailwind/estado); se mantiene por compatibilidad con el CSS-in-JS.
- Los tokens siguen en memoria del cliente (cookies httpOnly → NL-13/14).

## Impacto técnico
- `services/api/package.json`: +`express-rate-limit@^8.7.0`, +`helmet@^8.3.0`;
  -`@types/express-rate-limit`. `src/app.setup.ts`, `src/main.ts`.
- `apps/{store,admin}/vite.config.ts`: plugin `productionCsp()`.
- `apps/admin/src/auth/repositoryFactory.ts`: guard PROD.

## Riesgos
- Cambiar a multi-instancia requiere migrar a un store compartido de
  rate-limit (ADR INFRA futura); se deja acoplado a `THROTTLE_*` para facilitarlo.

## Referencias
ADR-NL-018 (RBAC/JWT), SECURITY_AUDIT.md (S-11/S-12/S-13), SECURITY_MODEL.md,
CHANGELOG [0.12.0].
