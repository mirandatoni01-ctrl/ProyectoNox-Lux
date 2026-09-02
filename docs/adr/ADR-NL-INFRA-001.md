# ADR-NL-INFRA-001 — Selección de proveedor de infraestructura (detalle)

**Estado:** ACEPTADO (NL-13)
**Fecha:** 2026-08-28 (actualizado 2026-08-31)
**Relacionados:** ADR-NL-007 (resumen), ADR-NL-001 (backend), ADR-NL-005
(PostgreSQL).

## Status
**Decidido (PO, NL-13):** **Hetzner Cloud** en la región **Ashburn (US East)**.
PostgreSQL **auto-gestionada** en el mismo VPS. No se aprovisiona nada en este
bloque (solo análisis y plan de despliegue); el aprovisionamiento real y la
validación corresponden al itinerario NL-13/14.

## Criterios de evaluación
| Criterio | Hetzner (elegido) | DigitalOcean (descartado) |
|---|---|---|
| Coste mensual (VPS 2vCPU/4GB) | CX23 ≈ **€5–6/mes** | Basic 4GB **$24/mes** (~4–5× más) |
| Facilidad de uso | Media | Alta |
| Región útil para Colombia/Latam | **Ashburn (US East)** ~50–80 ms | NYC/ATL/Richmond (sin DC en Latam) |
| Traffico incluido (región US) | 1 TB/mes | 4 TB/mes |
| PostgreSQL | Auto-gestionada (decidido) | Managed Database (no aplica: auto-gestionada) |
| Object Storage (imágenes) | Sí (Object Storage) | Sí (Spaces S3) |
| SLA | 99.9% de producto (sin SLA formal publicado) | 99.99% |
| Soporte/ecosistema | Buena documentación, sin teléfono | Excelente, muy usado |

## Decisión (ACEPTADA por el PO)
- **Proveedor:** Hetzner Cloud · **Región:** Ashburn (US East).
- **Instancia:** CX23 (2 vCPU / 4 GB / 40 GB NVMe) para `staging`.
- **PostgreSQL:** auto-gestionada (volumen separado + backups `pg_dump`).
- **Incluido en el plan:** STORE/ADMIN como SPA estática (con Cloudflare CDN
  opcional como mitigación de latencia), API NestJS en el VPS (Docker + Caddy/
  Nginx para TLS), entorno `staging` → `production`.

### Por qué Hetzner/Ashburn para el mercado Colombia/Latam
1. **Geografía:** para Bogotá la costa Este de EE.UU. (Ashburn) es más cercana
   (~50–80 ms estimado) que cualquier DC de Latam; DigitalOcean **no tiene** DC
   en América Latina, y su región más cercana no mejora la latencia de Ashburn.
2. **Coste:** ~4–5× más barato que DO en specs equivalentes; el PO dejó en mano
   la recomendación → se elige el mínimo razonable.
3. **BD auto-gestionada** (decidida) neutraliza la principal ventaja de DO
   (Managed Database).

## Datos usados para decidir (resueltos)
1. Presupuesto mensual: **recomendación** (mínimo razonable) por el PO.
2. Ubicación/mercado: **Colombia/Latam**.
3. BD: **auto-gestionada** (sin Managed Database).
4. Object Storage para imágenes (ADR-NL-015): se documenta, no se migra en NL-13.

## Impacto
Define `DEPLOYMENT_STRATEGY.md`, el entorno de staging (NL-13) y producción
(NL-14), más los costos mensuales estimados (~€6–8 staging).

## Riesgos
- Tráfico 1 TB/mes en región US (Hetzner): suficiente para staging; validar en NL-14.
- Latencia estimada a Colombia requiere validación real en staging.
- Sin SLA formal publicado por Hetzner.
- No hay entorno desplegado hasta que se apruebe el aprovisionamiento (NL-13/14).
