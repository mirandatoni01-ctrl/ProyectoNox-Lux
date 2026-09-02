# ADR-NL-014 — Estrategia móvil: Capacitor

**Estado:** APROBADO
**Renumerado:** antes ADR-NL-004 (la nueva directiva reserva ADR-NL-001..007 para el ecosistema Store/Admin/Backend). Este ADR rige el cliente STORE app.

## Contexto
El objetivo es una app Android instalable (APK/AAB). El MVP es una web app React.

## Problema
Elegir cómo empaquetar la app para Android reutilizando el código actual.

## Opciones consideradas
- **A)** Capacitor: envuelve la web app en un contenedor nativo Android, plugins
  para cámara/galería. *(elegida)*
- **B)** React Native: reescritura nativa, descarta el código actual.
- **C)** Solo web responsive (sin app instalable).

## Decisión propuesta
Capacitor. Se añade en los bloques NL-08 (cámara/galería) y NL-09 (Android
APK/AAB). El andamiaje actual (Vite) es compatible.

## Ventajas
- Reutiliza el 100% del código.
- Acceso a cámara/galería vía plugins.
- Camino directo a APK/AAB.

## Desventajas
- Rendimiento web (no nativo puro), aceptable para esta aplicación.

## Impacto técnico
Dependencias `@capacitor/core|android|camera` añadidas en NL-08/NL-09.

## Impacto en producción
Habilitan la publicación en Google Play.

## Riesgos
Bajos.