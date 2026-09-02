import type { Material } from '../types';

/** Etiquetas de material (mismo vocabulario que el Store y el seed del backend). */
export const MATERIAL_LABELS: Record<Material, string> = {
  STAINLESS_STEEL: 'ACERO INOXIDABLE',
  COVERGOLD: 'COVERGOLD',
  RHODIUM: 'RODIO',
};

export const CATEGORIES = [
  { id: 'anillos', name: 'ANILLOS' },
  { id: 'cadenas', name: 'CADENAS' },
  { id: 'aretes', name: 'ARETES' },
  { id: 'pulseras', name: 'PULSERAS' },
] as const;

/** Imágenes de muestra para el simulador de cámara del formulario (NL-09 real). */
export const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1611591475140-be3617c97886?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=600',
] as const;