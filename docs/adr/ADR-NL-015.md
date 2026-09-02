# ADR-NL-015 — Imágenes: cámara/galería local + almacenamiento local en MVP-1

**Estado:** APROBADO — **RECLASIFICADO (NL-00) a MIGRAR: el almacenamiento de imágenes pasará a Object Storage del backend**
**Renumerado:** antes ADR-NL-005 (la nueva directiva reserva ADR-NL-001..007 para el ecosistema Store/Admin/Backend).

## Contexto
Las imágenes actuales son URLs externas (Unsplash) y la cámara es simulada
(NL-ISSUE-003/014).

## Problema
Cómo capturar y almacenar imágenes reales.

## Opciones consideradas
- **A)** Capacitor camera/gallery + almacenamiento local en MVP-1. *(elegida)*
- **B)** Almacenamiento en la nube (depende del backend, futuro).
- **C)** Seguir con URLs externas (no recomendado).

## Decisión propuesta
En MVP-1, captura real con Capacitor y persistencia local de las imágenes
(coherente con ADR-NL-012). La subida a la nube se habilitará con el backend.

## Ventajas
- Sin costos ni dependencia cloud en MVP-1.
- Cámara y galería reales.

## Desventajas
- Las imágenes no son compartidas hasta el backend.

## Impacto técnico
Bloque NL-08.

## Impacto en producción
Preparado para migrar a almacenamiento gestionado.

## Riesgos
Bajos.