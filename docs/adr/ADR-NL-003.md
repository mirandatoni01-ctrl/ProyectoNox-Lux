# ADR-NL-003 — Fuente central de verdad (cliente subordinado al API)

**Estado:** APROBADO (dirección)
**Fecha:** 2026-08-28

## Contexto
El MVP trataba el IndexedDB del cliente como fuente de verdad. La directiva
establece que el **NOX & LUX API** es la fuente central de verdad del sistema.

## Problema
Garantizar que ningún dato canónico (productos, inventario, pedidos, clientes)
viva solo en el cliente.

## Opciones consideradas
- **A)** API como única fuente de verdad; lectura/escritura canónica vía HTTP. El
  Store puede tener caché/offline local subordinada (fallback). *(elegida)*
- **B)** Cliente con datos canónicos locales (status quo NL-02) — descartado.

## Decisión propuesta
El API es la única fuente de verdad. El Store (y el Admin) se comportan como
clientes del API (ADR-NL-001). Cualquier persistencia local es exclusivamente
caché/fallback de desarrollo u offline, nunca autoritativa.

## Ventajas
- Coherencia e integridad de datos.
- Inventario y pedidos operables de forma real y auditada.

## Desventajas
- El Store depende de la disponibilidad del API (mitigable con estrategia
  offline limitada).

## Impacto técnico
Los repositorios `ProductRepository`/`CartRepository` del Store migran a
implementaciones REST (ADR-NL-011 puertos reutilizados; NL-11). El montaje local
se conserva como fallback de desarrollo/offline (ADR-NL-012).

## Riesgos
Disponibilidad/dependencia de red; diseño de una política offline acotada.
