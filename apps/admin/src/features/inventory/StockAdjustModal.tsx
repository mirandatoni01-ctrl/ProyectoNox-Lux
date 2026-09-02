import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { StockEntry } from '../../types';
import { Modal } from '../../components/Modal';

export type StockWriteMode = 'set' | 'adjust';

interface Props {
  entry: StockEntry;
  mode: StockWriteMode;
  onSave: (variantId: string, mode: StockWriteMode, value: number, reason?: string) => void;
  onClose: () => void;
}

/**
 * Modal de ajuste de stock (NL-08): modo `set` fija el stockOnHand absoluto;
 * modo `adjust` aplica un delta (±). Motivo opcional (queda en el ledger).
 */
export function StockAdjustModal({ entry, mode, onSave, onClose }: Props) {
  const isSet = mode === 'set';
  const [value, setValue] = useState(isSet ? String(entry.stockOnHand) : '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      setError('Introduce un número entero.');
      return;
    }
    if (isSet && parsed < 0) {
      setError('El stock no puede ser negativo.');
      return;
    }
    if (!isSet && parsed === 0) {
      setError('El ajuste no puede ser 0.');
      return;
    }
    onSave(entry.productVariantId, mode, parsed, reason.trim() || undefined);
  };

  return (
    <Modal open onClose={onClose} title={isSet ? 'Fijar stock' : 'Ajustar stock'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-neutral-100 p-3">
          <p className="text-sm font-bold tracking-wide uppercase">{entry.productName}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {entry.sku} · actual {entry.stockOnHand} · disponible {entry.available}
          </p>
        </div>

        <label className="block">
          <span className="text-xs tracking-wider text-neutral-500">
            {isSet ? 'NUEVO STOCK *' : 'CANTIDAD (+/-) *'}
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="number"
            step="1"
            className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm uppercase outline-none focus:border-black"
          />
          {!isSet && (
            <span className="mt-1 block text-[10px] text-neutral-400">
              Ej.: 5 añade unidades, -5 las descuenta.
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-xs tracking-wider text-neutral-500">MOTIVO (OPCIONAL)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: reposición proveedor"
            className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm uppercase outline-none focus:border-black"
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 bg-black py-3 text-xs font-bold tracking-widest text-white uppercase hover:bg-neutral-800"
        >
          <Save size={14} /> {isSet ? 'Fijar stock' : 'Aplicar ajuste'}
        </button>
      </form>
    </Modal>
  );
}