import { Construction } from 'lucide-react';
import type { AdminModule } from '../../types';

/** Pantalla provisional para módulos de bloques futuros (NL-08..NL-10). */
export function PlaceholderPage({ module }: { module: AdminModule }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Construction size={28} className="text-neutral-300" />
      <p className="text-sm font-bold tracking-widest uppercase">Módulo {module}</p>
      <p className="max-w-xs text-xs leading-relaxed text-neutral-500">
        Planificado para una siguiente iteración del roadmap. Navega a Productos
        para probar la gestión de catálogo.
      </p>
    </div>
  );
}