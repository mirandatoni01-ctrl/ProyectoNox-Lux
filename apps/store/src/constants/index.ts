import type { Material, Product } from '../types';

/**
 * NOX & LUX — Constantes de negocio.
 * Números, etiquetas y catálogo de demostración.
 * Valores sensibles (p. ej. número de WhatsApp) van en variables de entorno, no aquí.
 */

export const MATERIAL_LABELS: Record<Material | 'ALL', string> = {
  ALL: 'TODOS',
  STAINLESS_STEEL: 'ACERO INOXIDABLE',
  COVERGOLD: 'COVERGOLD',
  RHODIUM: 'RODIO',
};

export const CATEGORIES = [
  { id: 'ALL', name: 'TODAS' },
  { id: 'anillos', name: 'ANILLOS' },
  { id: 'cadenas', name: 'CADENAS' },
  { id: 'aretes', name: 'ARETES' },
  { id: 'pulseras', name: 'PULSERAS' },
] as const;

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'ANILLO HELIOS LUX',
    category: 'anillos',
    basePrice: 45.0,
    material: 'COVERGOLD',
    description:
      'Anillo geométrica con triple baño de Covergold de 24k. Acabado espejado de máxima durabilidad y diseño anatómico.',
    variants: [
      { material: 'COVERGOLD', size: 'Talla 6', stock: 12, priceOverride: 45.0 },
      { material: 'COVERGOLD', size: 'Talla 7', stock: 8, priceOverride: 45.0 },
      { material: 'COVERGOLD', size: 'Talla 8', stock: 0, priceOverride: 45.0 },
    ],
    isActive: true,
    imageUrl:
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'prod-2',
    name: 'CADENA CHOKER NOX',
    category: 'cadenas',
    basePrice: 62.0,
    material: 'STAINLESS_STEEL',
    description:
      'Choker de eslabones pulidos en Acero Inoxidable 316L. Inalterable al agua, perfumes y sudor.',
    variants: [
      { material: 'STAINLESS_STEEL', size: '40 cm', stock: 15, priceOverride: 62.0 },
      { material: 'STAINLESS_STEEL', size: '45 cm', stock: 20, priceOverride: 62.0 },
    ],
    isActive: true,
    imageUrl:
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'prod-3',
    name: 'PULSERA EOS RHODIUM',
    category: 'pulseras',
    basePrice: 38.0,
    material: 'RHODIUM',
    description:
      'Brazalete rígido articulado con recubrimiento electrolítico en Rodio blanco ultrabrillante.',
    variants: [{ material: 'RHODIUM', size: 'Ajustable', stock: 6, priceOverride: 38.0 }],
    isActive: true,
    imageUrl:
      'https://images.unsplash.com/photo-1611591475140-be3617c97886?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'prod-4',
    name: 'ARETES ORBITA MINIMAL',
    category: 'aretes',
    basePrice: 28.0,
    material: 'COVERGOLD',
    description:
      'Argollas tubulares ligeras con cierre de seguridad. Baño protector anti-alérgico en Covergold.',
    variants: [
      { material: 'COVERGOLD', size: '15 mm', stock: 18, priceOverride: 28.0 },
      { material: 'COVERGOLD', size: '20 mm', stock: 5, priceOverride: 32.0 },
    ],
    isActive: true,
    imageUrl:
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'prod-5',
    name: 'ANILLO SOMBRA MATTE',
    category: 'anillos',
    basePrice: 34.0,
    material: 'STAINLESS_STEEL',
    description: 'Banda ancha cepillada en acero inoxidable con bisel pulido brillante.',
    variants: [
      { material: 'STAINLESS_STEEL', size: 'Talla 8', stock: 14, priceOverride: 34.0 },
      { material: 'STAINLESS_STEEL', size: 'Talla 9', stock: 2, priceOverride: 34.0 },
    ],
    isActive: true,
    imageUrl:
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'prod-6',
    name: 'DIJE MEDALLA RODIO',
    category: 'cadenas',
    basePrice: 54.0,
    material: 'RHODIUM',
    description:
      'Medallón grabado con patrón geométrico en acabado rodiado de alta intensidad visual.',
    variants: [{ material: 'RHODIUM', size: '50 cm', stock: 9, priceOverride: 54.0 }],
    isActive: true,
    imageUrl:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600',
  },
];