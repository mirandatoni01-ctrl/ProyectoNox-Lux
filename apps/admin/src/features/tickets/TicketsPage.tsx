import { Fragment, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';
import type { ContactTicket, TicketStatusValue } from '../../types';
import { useTickets } from './useTickets';

const STATUS_META: Record<TicketStatusValue, { label: string; className: string }> = {
  new: { label: 'NUEVO', className: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'EN PROGRESO', className: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'RESUELTO', className: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'CERRADO', className: 'bg-neutral-200 text-neutral-500' },
};

const NEXT_STATUS: TicketStatusValue[] = ['new', 'in_progress', 'resolved', 'closed'];

/**
 * Tickets de contacto (NL-13): mensajes del formulario "Contact Us" del Store.
 * Requiere `tickets:ver` / `tickets:gestionar`.
 */
export function TicketsPage() {
  const { tickets, isLoading, error, reload, updateStatus } = useTickets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const handleStatus = async (ticket: ContactTicket, status: TicketStatusValue) => {
    setBusyId(ticket.id);
    try {
      await updateStatus(ticket.id, status, note[ticket.id] || undefined);
      showToast(`TICKET ${STATUS_META[status].label}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el ticket.');
    } finally {
      setBusyId(null);
    }
  };

  const handleNote = (e: FormEvent<HTMLTextAreaElement>, id: string) => {
    setNote((prev) => ({ ...prev, [id]: e.currentTarget.value }));
  };

  const openCount = tickets.filter((t) => t.status === 'new' || t.status === 'in_progress').length;

  return (
    <div>
      {toast && (
        <div className="animate-fade-in fixed right-4 top-4 z-50 bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-widest uppercase">Tickets de contacto</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {tickets.length} tickets · {openCount} abiertos
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

      {isLoading && <p className="mt-8 text-sm text-neutral-500">Cargando tickets…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!isLoading && !error && (
        <div className="mt-6 overflow-hidden border-y border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[10px] tracking-widest text-neutral-400 uppercase">
                <th className="py-3 pr-4 font-semibold">Ticket</th>
                <th className="py-3 pr-4 font-semibold">Contacto</th>
                <th className="py-3 pr-4 font-semibold">Asunto</th>
                <th className="py-3 pr-4 font-semibold">Fecha</th>
                <th className="py-3 text-right font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tickets.map((ticket) => {
                const meta = STATUS_META[ticket.status];
                const expanded = expandedId === ticket.id;
                return (
                  <Fragment key={ticket.id}>
                    <tr
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => setExpandedId(expanded ? null : ticket.id)}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] tracking-wider text-neutral-400 uppercase">
                            #{ticket.id.slice(0, 8)}
                          </span>
                          {expanded ? (
                            <ChevronUp size={14} className="text-neutral-400" />
                          ) : (
                            <ChevronDown size={14} className="text-neutral-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="truncate font-bold tracking-wide uppercase">{ticket.name}</p>
                        <p className="text-xs text-neutral-500">{ticket.email}</p>
                      </td>
                      <td className="max-w-[220px] truncate py-3 pr-4">{ticket.subject}</td>
                      <td className="py-3 pr-4 text-xs text-neutral-500">
                        {new Date(ticket.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={5} className="bg-neutral-50 px-4 py-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="text-xs">
                              <p className="font-bold uppercase tracking-wide">Mensaje</p>
                              <p className="mt-1 whitespace-pre-wrap text-neutral-600">
                                {ticket.message}
                              </p>
                              <p className="mt-3 flex flex-wrap gap-1 text-[10px] text-neutral-400 uppercase">
                                {ticket.phone && <span>{ticket.phone}</span>}
                                {ticket.userId && (
                                  <span className="rounded-full bg-neutral-200 px-2 py-0.5">
                                    comprador registrado
                                  </span>
                                )}
                              </p>
                              {ticket.adminNote && (
                                <p className="mt-2 border-l-2 border-neutral-300 pl-2 text-neutral-500">
                                  Nota admin: {ticket.adminNote}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <textarea
                                value={note[ticket.id] ?? ''}
                                onChange={(e) => handleNote(e, ticket.id)}
                                rows={2}
                                placeholder="Nota para el cliente (opcional)"
                                className="w-full border border-neutral-300 px-3 py-2 text-xs focus:border-black focus:outline-none resize-none"
                              />
                              <div className="flex flex-wrap gap-2">
                                {NEXT_STATUS.map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={busyId === ticket.id}
                                    onClick={() => void handleStatus(ticket, status)}
                                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase disabled:opacity-50 ${
                                      status === ticket.status
                                        ? 'border-black bg-black text-white'
                                        : 'border-neutral-300 hover:border-black'
                                    }`}
                                  >
                                    {STATUS_META[status].label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-neutral-500">
                    NO HAY TICKETS AÚN.
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