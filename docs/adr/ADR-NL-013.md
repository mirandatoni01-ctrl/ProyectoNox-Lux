# ADR-NL-013 — Autenticación por puerto/interfaz (credential local en MVP-1)

**Estado:** APROBADO — **SUPERSEDIDO por ADR-NL-001/002 en producción (queda como puerto)**
**Renumerado:** antes ADR-NL-003 (la nueva directiva reserva ADR-NL-001..007 para el ecosistema Store/Admin/Backend).

## Contexto
El botón de cambio CUSTOMER/ADMIN no es autorización real (NL-ISSUE-002, S-01).
El PO eligió "Login con backend/servicio", pero la persistencia es local primero
(ADR-NL-012). Un backend de auth requiere un servidor que aún no existe.

## Problema
Conciliar autenticación "real" con ausencia de backend en MVP-1.

## Opciones consideradas
- **A)** Port de autenticación; en MVP-1 credencial ADMIN validada localmente
  (hash), con implementación real (backend/servicio) intercambiable después. *(propuesta)*
- **B)** Backend de auth desde MVP-1 (contradice persistencia local elegida).
- **C)** Ninguna autenticación (inaceptable en producción).

## Decisión propuesta
Definir una interfaz `AuthService` (login, logout, sesión, `role`). MVP-1 usa una
implementación local que valida credencial contra un hash almacenado (no un
botón). Se reemplaza por el servicio real al integrar backend (NL-03+).

## Ventajas
- Cumple política de seguridad (no rol por UI).
- Sin bloqueo: no necesita servidor en MVP-1.
- Puerto listo para el proveedor real.

## Desventajas
- La credencial local sigue siendo débil si se publica sin backend → no exponer a
  producción hasta integrar auth real.

## Impacto técnico
Crea `services/authentication` y `features/authentication`.

## Impacto en producción
Bloquea (gate) la salida a producción hasta tener auth real.

## Riesgos
Publicar el modo local antes de auth real sería inseguro.

---
*Confirmado por el Product Owner el 2026-08-28.*