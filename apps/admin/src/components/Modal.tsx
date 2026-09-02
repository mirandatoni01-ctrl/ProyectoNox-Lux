import type { ReactNode } from 'react';

/** Modal genérico del Admin (estética black/white luxury). */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <h3 className="text-sm font-bold tracking-widest uppercase">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}