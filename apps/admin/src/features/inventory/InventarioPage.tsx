import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, RefreshCcw, SlidersHorizontal } from 'lucide-react';
import type { StockEntry } from '../../types';
import { MATERIAL_LABELS } from '../../constants';
import { useInventory } from './useInventory';
import { StockAdjustModal, type StockWriteMode } from './StockAdjustModal';

/**
 * Panel de inventario (NL-08): stock por variante con ajustes (set/adjust)
 * contra la NOX & LUX API. `available` (disponible) = stock − reservado.
 * NL-13: atajo "Nuevo producto" a /productos/nuevo.
 */
export function InventarioPage() {
  const { entries, isLoading, error, reload, setStock, adjustStock } = useInventory();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ entry: StockEntry; mode: StockWriteMode } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const handleSave = async (variantId: string, mode: StockWriteMode, value: number, reason?: string) => {
    try {
      if (mode === 'set') {
        await setStock(variantId, value, reason);
        showToast('STOCK ACTUALIZADO');
      } else {
        await adjustStock(variantId, value, reason);
        showToast('AJUSTE APLICADO');
      }
      setEditing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
    }
  };

  const lowCount = entries.filter((e) => e.available <= 0).length;

  return (
    <div>
      {toast && (
        <div className="animate-fade-in fixed right-4 top-4 z-50 bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-widest uppercase">Inventario</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {entries.length} variantes · {lowCount} sin disponible
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/productos/nuevo')}
            className="flex items-center gap-2 border border-black bg-black px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase hover:bg-neutral-800"
          >
            <PackagePlus size={14} /> Nuevo producto
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="flex items-center gap-2 border border-black px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-black hover:text-white"
          >
            <RefreshCcw size={14} /> Refrescar
          </button>
        </div>
      </div>

      {isLoading && <p className="mt-8 text-sm text-neutral-500">Cargando inventario…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!isLoading && !error && (
        <div className="mt-6 overflow-x-auto border-y border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[10px] tracking-widest text-neutral-400 uppercase">
                <th className="py-3 pr-4 font-semibold">Producto</th>
                <th className="py-3 pr-4 font-semibold">SKU</th>
                <th className="py-3 pr-4 font-semibold">Material</th>
                <th className="py-3 pr-4 font-semibold">Talla</th>
                <th className="py-3 pr-4 text-right font-semibold">Stock</th>
                <th className="py-3 pr-4 text-right font-semibold">Reservado</th>
                <th className="py-3 pr-4 text-right font-semibold">Disponible</th>
                <th className="py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.map((entry) => (
                <tr key={entry.productVariantId}>
                  <td className="max-w-[220px] truncate py-3 pr-4 font-bold tracking-wide uppercase">
                    {entry.productName}
                  </td>
                  <td className="py-3 pr-4 text-xs text-neutral-500">{entry.sku}</td>
                  <td className="py-3 pr-4 text-xs text-neutral-500">
                    {MATERIAL_LABELS[entry.material] ?? entry.material}
                  </td>
                  <td className="py-3 pr-4 text-xs text-neutral-500">{entry.size}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{entry.stockOnHand}</td>
                  <td className="py-3 pr-4 text-right text-neutral-500">{entry.reserved}</td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        entry.available <= 0
                          ? 'bg-red-100 text-red-600'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {entry.available <= 0 ? 'agotado' : entry.available}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing({ entry, mode: 'adjust' })}
                        aria-label={`Ajustar stock de ${entry.sku}`}
                        className="rounded-full border border-neutral-300 p-2 text-neutral-500 hover:border-black hover:text-black"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing({ entry, mode: 'set' })}
                        className="rounded-full bg-black p-2 text-white hover:bg-neutral-800"
                        aria-label={`Fijar stock de ${entry.sku}`}
                      >
                        <SlidersHorizontal size={14} className="rotate-90" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-neutral-500">
                    NO HAY VARIANTES CON STOCK.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <StockAdjustModal
          key={`${editing.entry.productVariantId}-${editing.mode}`}
          entry={editing.entry}
          mode={editing.mode}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}