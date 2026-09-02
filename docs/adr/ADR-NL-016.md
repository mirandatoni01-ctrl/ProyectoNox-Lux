# ADR-NL-016 — Número WhatsApp en variables de entorno

**Estado:** APROBADO
**Renumerado:** antes ADR-NL-006 (la nueva directiva reserva ADR-NL-001..007 para el ecosistema Store/Admin/Backend). En NL-10 el envío/pedido por WhatsApp pasa a gestionarse vía API backend.

## Contexto
El número estaba hardcodeado en el código (`573000000000`, NL-ISSUE-007, S-03).

## Problema
Configurar el número de ventas sin exponer secretos ni hardcodear valores.

## Opciones consideradas
- **A)** Variable de entorno `VITE_WHATSAPP_NUMBER`. *(elegida)*
- **B)** Dejar hardcodeado (contrario a política de seguridad).

## Decisión propuesta
Leer el número desde entorno. Se añadió `VITE_WHATSAPP_NUMBER` a `.env.example`
(placeholder). El valor real se completará en `.env` (no commiteado) y se aplicará
en NL-07.

## Ventajas
- Configuración centralizada y sin secretos en el código.
- Cambio de número sin recompilar.

## Desventajas
- Requiere que el PO proporcione el número real para operar.

## Impacto técnico
`.env.example` y utilidad de configuración.

## Impacto en producción
El número queda listo para configurar por entorno.

## Riesgos
Pendiente el número real del PO.