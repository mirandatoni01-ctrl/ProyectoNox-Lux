# ADR-NL-012 — Persistencia: local primero, con puerto hacia backend futuro

**Estado:** APROBADO — **IMPLEMENTADO (NL-02)** — **RECLASIFICADO (NL-00) a fallback/desarrollo**
**Renumerado:** antes ADR-NL-002 (la nueva directiva reserva ADR-NL-001..007 para el ecosistema Store/Admin/Backend).

## Contexto
El MVP guarda todo en memoria (NL-ISSUE-001). Se necesita persistencia real.

## Problema
Elegir dónde viven los datos (productos, variantes, inventario, pedidos) sin
incurrir en costos ni retrabajo antes de tiempo.

## Opciones consideradas
- **A)** Persistencia local (IndexedDB/localStorage) + capa/port de repositorio
  intercambiable. *(elegida)*
- **B)** Backend + BD gestionada desde el inicio (costos y complejidad).
- **C)** Solo local permanente (sin catálogo/pedidos compartidos).

## Decisión propuesta
MVP-1 con persistencia local mediante un **port de repositorio**: la UI depende de
una interfaz (`ProductRepository`), no de una implementación concreta, de modo que
NL-02 implementa la versión local y un futuro backend solo implementa la misma
interfaz.

## Ventajas
- Sin costos recurrentes en MVP-1.
- Migración a backend sin reescribir la UI.
- Coherente con autenticación por puerto (ADR-NL-013).

## Desventajas
- No hay datos compartidos multiusuario hasta el backend.

## Impacto técnico
Define la capa `services/repositories` y el contrato de datos.

## Impacto en producción
Base para migrar a una fuente de verdad centralizada.

## Riesgos
El backend futuro debe respetar el contrato del port.