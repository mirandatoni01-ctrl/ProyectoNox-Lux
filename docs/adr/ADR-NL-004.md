# ADR-NL-004 — Arquitectura backend inicial: Modular Monolith

**Estado:** APROBADO (dirección) — se valida en NL-03
**Fecha:** 2026-08-28

## Contexto
Se construirá un backend propio (ADR-NL-001). Para un negocio de esta escala es
crucial elegir una topología que equilibre simplicidad, velocidad de desarrollo y
futura escalabilidad.

## Problema
Elegir la forma estructural del backend (módulos, tamaño, transición futura).

## Opciones consideradas
- **A)** **Modular Monolith**: un solo despliegue con módulos bien delimitados
  (auth, productos, inventario, pedidos, clientes, media, auditoría) que comparten
  BD PostgreSQL. Permite extraer microservicios después si hace falta. *(elegida)*
- **B)** Microservicios desde el inicio: más operación, red, y sobredimensionado
  para esta etapa.
- **C)** Monolito sin límites de módulo: acoplamiento alto y deuda temprana.

## Decisión propuesta
**Modular Monolith** con NestJS: módulos independientes por dominio, cada uno con
su capa de API, servicio y persistencia, compartiendo el mismo proceso y BD.
NestJS favorece este estilo (módulos, DI, guards).

## Ventajas
- Desarrollo y despliegue simples; una sola unidad a operar.
- División clara por dominios → fácil de migrar a microservicios si se requiere.
- Coste operativo inicial bajo (ideal para Hetzner/DigitalOcean).

## Desventajas
- El monolito escala vertical antes que horizontal (aceptable en este tamaño).

## Impacto técnico
Estructura de módulos definida en NL-03. Los límites de dominio se documentan en
SYSTEM_BOUNDARIES.md.

## Riesgos
Si crece mucho, requerirá partir módulos; mitigado por el diseño modular.
