# DEPLOYMENT_STRATEGY — NOX & LUX

**Versión:** 1.1
**Fecha:** 2026-08-28 (actualizado 2026-08-31)
**Estado:** Proveedor de infraestructura **ACEPTADO — Hetzner @ Ashburn** (ADR-NL-007 / INFRA-001).
**Relacionados:** ARCHITECTURE_BLUEPRINT_V1.md, ADR-NL-001/005/007/INFRA-001.

## Propósito

Definir cómo se despliegan y publican los tres sistemas (STORE, ADMIN, API + BD)
en cada entorno, y qué depende de la decisión de infraestructura.

---

## 1. Entornos

| Entorno | Método | Uso |
|---|---|---|
| **local** | `npm run dev` en la máquina del dev (Vite) + API local + PostgreSQL local (Docker) | desarrollo |
| **staging** | Provisión en la nube del proveedor elegido | pre-producción, integración, validación PO (NL-13) |
| **producción** | Provisión en la nube del proveedor elegido | lanzamiento real (NL-14) |

---

## 2. Topología objetivo (producción)

```
                Internet (TLS/HTTPS)
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
   STORE (SPA estática)         ADMIN (SPA privada)
        │                             │
        └──────────────┬──────────────┘
                       ▼
              NOX & LUX API (Node.js/VPS)
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PostgreSQL       Object Storage   (logs/audit)
```

- **API + PostgreSQL**: una instancia Hetzner **CX23 @ Ashburn** (2 vCPU / 4 GB /
  40 GB NVMe). PostgreSQL **auto-gestionada** en el mismo VPS (volumen separado +
  backups `pg_dump`), según decisión del PO.
- **STORE / ADMIN**: buildeados como SPA estática servida por el mismo VPS
  (reverse proxy) o por un CDN/Static de bajo coste (**Cloudflare CDN** opcional
  para mitigar latencia a Latam). Almacenados en `apps/store/dist`,
  `apps/admin/dist`.
- **TLS/HTTPS** en todos los dominios/subdominios de entorno no local.

---

## 3. Despliegue por sistema

### API
- Build de TS → `dist/`; proceso gestionado (PM2/systemd) o contenedor (Docker).
- Variables de entorno: `DATABASE_URL`, `JWT_SECRET`, `STORAGE_*`, `PORT`,
  `VITE_*` no aplican (son de frontends), etc. (`.env` nunca versionado).
- Migraciones de BD con Prisma (`prisma migrate deploy`) antes de arrancar.

### STORE APP
- Build estático (`vite build`), copia a la ruta pública del proxy.
- Deploy también como PWA/Android vía Capacitor (ADR-NL-014, bloques NL-08/NL-09).

### ADMIN PANEL
- Build estático, servido en **subdominio/URL separado** y protegido.
- Autenticación contra el API (JWT). Control de acceso por permisos.

---

## 4. Proceso de entrega

1. Commit en el monorepo → CI (lint, typecheck, test).
2. Build de los artefactos (API, STORE, ADMIN).
3. Deploy a staging → validación del PO.
4. Deploy a producción tras aprobación.
(El servidor de CI/CD concreto se define en NL-12/NL-13 según proveedor.)

---

## 5. Decisión de infraestructura (ADR-NL-007 / INFRA-001)

**Decidido (PO, NL-13):** **Hetzner Cloud**, región **Ashburn (US East)**,
PostgreSQL **auto-gestionada**. Este bloque documenta el plan; **no
aprovisiona** (el despliegue real se aprueba/ejecuta según el itinerario
NL-13/14).

| Elemento | Decisión (Hetzner @ Ashburn) |
|---|---|
| Instancia API | Hetzner Cloud **CX23** (2 vCPU / 4 GB / 40 GB NVMe) |
| PostgreSQL | **auto-gestionada** en el mismo VPS (volumen separado, `pg_dump`) |
| Object Storage (imágenes, NL-14) | Hetzner Object Storage (S3-compatible) — no se migra en NL-13 |
| Reverse proxy / TLS | Caddy/Nginx (TLS automático) |
| STORE / ADMIN | SPA estática (Cloudflare CDN opcional) |
| Facilidad | media (auto-gestión de BD) |

### Staging (NL-13) — topología concreta
- **STORE / ADMIN**: `vite build` → artefactos estáticos servidos tras reverse
  proxy del VPS (y Cloudflare CDN opcional).
- **API**: contenedor Docker en el VPS CX23, expuesto por Caddy/Nginx con TLS.
- **PostgreSQL**: instancia auto-gestionada en el VPS (volumen separado), backups
  `pg_dump` programados.
- **Env `staging`**: `DATABASE_URL`, `JWT_SECRET`, `WHATSAPP_NUMBER` (fake),
  `STORAGE_*`, CORS allow-list, etc. (`VITE_AUTH_MODE=api`; prohibido `dev`).
- Presupuesto estimado stagging: **~€6–8/mes** (CX23 + IPv4).

### Latencia mercadeo Colombia/Latam
- Para Bogotá la **costa Este de EE.UU. (Ashburn)** es la región óptima (~50–80 ms
  estimado); DigitalOcean no tiene DC en Latam y su región más cercana no mejora
  esta latencia. Validar con pruebas reales en staging antes de producción.

**Acción restante:** aprovisionamiento y validación reales en NL-13 (staging) /
NL-14 (producción), tras aprobación del despliegue por el PO.

---

*Actualizar este documento cuando se resuelva ADR-NL-INFRA-001.*
