import { Fragment, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';
import type { Order, OrderStatus } from '../../types';
import { MATERIAL_LABELS } from '../../constants';
import { useOrders } from './useOrders';

/**
 * Panel de pedidos (NL-10, F-10/F-20): lista de pedidos del backend con detalle
 * de items y transición de estados (pending → confirmed → completed, o cancel).
 * El alta la realiza el Store vía WhatsApp; aquí se gestiona (pedidos:gestionar).
 */

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'PENDIENTE', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'CONFIRMADO', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'CANCELADO', className: 'bg-red-100 text-red-600' },
  completed: { label: 'COMPLETADO', className: 'bg-emerald-100 text-emerald-700' },
};

function nextActions(status: OrderStatus): OrderStatus[] {
  if (status === 'pending') return ['confirmed', 'cancelled'];
  if (status === 'confirmed') return ['completed', 'cancelled'];
  return [];
}

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirmar',
  completed: 'Completar',
  cancelled: 'Cancelar',
};

export function PedidosPage() {
  const { orders, isLoading, error, reload, updateStatus } = useOrders();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const handleStatus = async (order: Order, status: OrderStatus) => {
    try {
      await updateStatus(order.id, status);
      showToast(`PEDIDO ${status.toUpperCase()}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div>
      {toast && (
        <div className="animate-fade-in fixed right-4 top-4 z-50 bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-widest uppercase">Pedidos</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {orders.length} pedidos · {pendingCount} pendientes
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="flex items-center gap-2 border border-black px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-black hover:text-white"
        >
          <RefreshCcw size={14} /> Refrescar
        </button>
      </div>

      {isLoading && <p className="mt-8 text-sm text-neutral-500">Cargando pedidos…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!isLoading && !error && (
        <div className="mt-6 overflow-hidden border-y border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[10px] tracking-widest text-neutral-400 uppercase">
                <th className="py-3 pr-4 font-semibold">Pedido</th>
                <th className="py-3 pr-4 font-semibold">Cliente</th>
                <th className="py-3 pr-4 font-semibold">WhatsApp</th>
                <th className="py-3 pr-4 text-right font-semibold">Total</th>
                <th className="py-3 pr-4 font-semibold">Estado</th>
                <th className="py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((order) => {
                const meta = STATUS_META[order.status];
                const actions = nextActions(order.status);
                const expanded = expandedId === order.id;
                return (
                  <Fragment key={order.id}>
                    <tr key={order.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => setExpandedId(expanded ? null : order.id)}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] tracking-wider text-neutral-400 uppercase">
                            #{order.id.slice(0, 8)}
                          </span>
                          {expanded ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                        </div>
                      </td>
                      <td className="max-w-[200px] truncate py-3 pr-4 font-bold tracking-wide uppercase">
                        {order.customer?.name ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-neutral-500">{order.whatsappPhone}</td>
                      <td className="py-3 pr-4 text-right font-semibold">${order.totalAmount.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {actions.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => void handleStatus(order, status)}
                              className={`rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border ${
                                status === 'cancelled'
                                  ? 'border-red-300 text-red-600 hover:bg-red-600 hover:text-white'
                                  : 'border-black text-black hover:bg-black hover:text-white'
                              }`}
                            >
                              {ACTION_LABEL[status]}
                            </button>
                          ))}
                          {actions.length === 0 && (
                            <span className="px-3 py-1.5 text-[10px] tracking-widest text-neutral-300 uppercase">finalizado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${order.id}-items`}>
                        <td colSpan={6} className="bg-neutral-50 px-4 py-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <ul className="space-y-2">
                              {order.items.map((item) => (
                                <li key={item.id} className="flex items-start justify-between gap-3 text-xs">
                                  <div className="min-w-0">
                                    <p className="truncate font-bold tracking-wide uppercase">{item.name}</p>
                                    <p className="mt-0.5 text-neutral-500">
                                      {MATERIAL_LABELS[item.material as keyof typeof MATERIAL_LABELS] ?? item.material} · {item.size} · x{item.quantity}
                                    </p>
                                  </div>
                                  <p className="shrink-0 font-semibold">${item.lineTotal.toFixed(2)}</p>
                                </li>
                              ))}
                            </ul>
                            <div className="text-xs text-neutral-500">
                              <p>
                                Creado:{' '}
                                {new Date(order.createdAt).toLocaleString('es-CO', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </p>
                              <p className="mt-1">Fuente: {order.source}</p>
                              <p className="mt-1">Id: {order.id}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-neutral-500">
                    NO HAY PEDIDOS AÚN.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}