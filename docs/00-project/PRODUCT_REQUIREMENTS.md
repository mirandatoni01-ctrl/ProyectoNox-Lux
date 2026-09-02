# PRODUCT REQUIREMENTS — NOX & LUX

**Documento:** 00 — Project

## Experiencia cliente

1. Catálogo de productos (grid, imágenes, precio, material, categoría).
2. Búsqueda por nombre/descripción.
3. Filtros por material (ACERO / COVERGOLD / RODIO) y categoría (anillos,
   cadenas, aretes, pulseras).
4. Detalle de producto con descripción y selector de variante (talla/medida).
5. Indicación de disponibilidad (AGOTADO cuando stock = 0).
6. Carrito con cantidad, subtotal, total estimado y envío "por acordar".
7. Validación de inventario (no exceder stock).
8. Pedido vía WhatsApp con resumen estructurado.
9. (Futuro) pedidos y pagos estructurados.

## Experiencia administrador

1. Autenticación segura (no botón de rol).
2. Listado de productos con estado visible/oculto.
3. Crear producto (nombre, material, categoría, precio, stock, medida, descripción).
4. Editar producto (nombre, precio, descripción) → ampliar a variantes/imágenes/stock.
5. Activar/desactivar producto.
6. Variantes múltiples con tallas, medidas, precios y stock.
7. Imágenes: cámara y galería reales.
8. (Futuro) gestión de pedidos.

> **NL-00 (redirección):** La experiencia administrador migra del Store (panel
> integrado) a un **Admin Panel separado** (ADR-NL-002/006), con autenticación y
> autorización reales contra el backend (SECURITY_MODEL.md). La experiencia
> cliente permanece en el Store. Backend gestiona productos, inventario, pedidos,
> clientes y media (ADR-NL-001).

## Restricciones transversales

- Tipado TypeScript, sin `any` innecesario.
- Configuración centralizada, secretos en variables de entorno.
- Manejo de errores, carga, vacío y fallos de red.
- Identidad visual NOX & LUX preservada (sin rediseños innecesarios).
- Roles con autorización real (fuente de verdad, no UI).