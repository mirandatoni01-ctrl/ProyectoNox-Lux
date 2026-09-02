# ADR-NL-007 — Proveedor de infraestructura

**Estado:** ACEPTADO (NL-13)
**Fecha:** 2026-08-28 (actualizado 2026-08-31)

## Contexto
Se necesita un proveedor para alojar el backend (ADR-NL-001) y la base de datos
PostgreSQL (ADR-NL-005), y para servir los builds de Store y Admin. El detalle
completo vive en `ADR-NL-INFRA-001`.

## Problema
Elegir el proveedor de hosting/infraestructura.

## Opciones consideradas (finalistas)
- **A)** **Hetzner Cloud**: muy buen precio/rendimiento, red excelente, PostgreSQL
  en la propia instancia. **Decidido.**
- **B)** **DigitalOcean**: facilidad de uso, Droplets/App Platform y PostgreSQL
  gestionado (Managed Database), ecosistema y docs excelentes. Descartado por
  coste (PG auto-gestionada ya decidida) y sin ventaja geográfica para Latam.

## Decisión propuesta (ACEPTADA por el PO — NL-13)
- **Proveedor:** **Hetzner Cloud**.
- **Región:** **Ashburn (US East, Virginia)** para la API + PostgreSQL.
- **Instancia:** serie **CX23** (2 vCPU / 4 GB / 40 GB NVMe) en `staging`; en
  `production` (NL-14) se dimensionará según carga.
- **PostgreSQL:** **auto-gestionada** en el mismo VPS (volumen separado, backups
  `pg_dump` periódicos). Sin Managed Database.

### Fundamentos (mercado Colombia/Latam)
- El mercado objetivo es **Colombia/Latam**. Para usuarios en Bogotá, la **costa
  Este de EE.UU.** (Ashburn) está geográficamente más cerca (~50–80 ms estimado)
  que Brasília/São Paulo (~4.300 km), por lo que **Ashburn es la región óptima**.
- Hetzner tiene datacenter en **Ashburn** (además de Falkenstein/Nuremberg/
  Helsinki/Hillsboro), eliminando la premisa obsoleta de "Hetzner solo Europa".
- DigitalOcean **no tiene datacenter en América Latina**; su región más cercana
  para Colombia (NYC/ATL/Richmond) ofrece latencia similar a la de Ashburn, por
  lo que su ventaja geográfica no aplica aquí.
- **Coste:** CX23 ≈ **€5–6/mes** vs el Droplet Basic 4 GB de DO a **$24/mes**
  (~4–5× más barato) por specs equivalentes, con mejor IOPS NVMe para PostgreSQL.
  El PO no fijó presupuesto ("dejo la recomendación"): se elige el mínimo
  razonable.
- Como la PG es **auto-gestionada** (decisión del PO), la principal ventaja de DO
  (Managed Database) queda neutralizada.

## Ventajas / Desventajas de cada opción
- **Hetzner (elegido):** más económico (~4–5×), 1 TB/mes de tráfico incluido en
  la región US (suficiente para staging), sin teléfono de soporte y ecosistema
  más sobrio que DO. La PG se auto-gestiona (backups + monitoreo manual).
- **DigitalOcean (descartado):** más amigable, SLA 99.99%, mejor documentación,
  pero ~4× más caro y sin DC en Latam; su valor diferencial (managed DB) no aplica.

## Impacto técnico
Determina ADR-NL-INFRA-001, la plantilla de despliegue (DEPLOYMENT_STRATEGY.md) y
el entorno de staging (NL-13) y producción (NL-14). El despliegue real se
aprueba/ejecuta según el itinerario (NL-13/14); este ADR fija la decisión de
proveedor y no supone aprovisionamiento por sí mismo.

## Riesgos
- 1 TB/mes de tráfico en la región US (vs 20 TB en Europa): suficiente para
  staging; revisar tráfico en producción/medios en NL-14.
- Sin SLA formal publicado por Hetzner (SLA 99.9% de producto): aceptable para
  el perfil; mitigar con monitoreo y backups.
- Latencia estimada a Colombia no verificada en producción: validar con pruebas
  reales en staging (NL-13) antes del lanzamiento.

## Decisión pendiente (del PO)
- **Resuelto:** presupuesto (recomendado mínimo razonable), ubicación (Colombia/
  Latam → Ashburn) y BD auto-gestionada.
- **Pendiente para NL-14:** dimensionamiento exacto de producción, dominio(s),
  y aprovisionamiento definitivo (este ADR solo fija el proveedor/región).
