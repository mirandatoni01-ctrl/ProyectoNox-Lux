import { useState } from 'react';
import { RefreshCcw, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import type { AdminUser } from '../../types';
import { useUsers } from './useUsers';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CUSTOMER: 'Cliente',
};

const ROLE_CLASS: Record<string, string> = {
  SUPER_ADMIN: 'bg-black text-white',
  ADMIN: 'bg-blue-100 text-blue-700',
  CUSTOMER: 'bg-neutral-200 text-neutral-600',
};

/**
 * Gestión de usuarios (NL-13, F-30): lista usuarios, muestra roles y permite
 * activar/desactivar la cuenta. Requiere `usuarios:ver` / `usuarios:gestionar`.
 */
export function UsersPage() {
  const { users, isLoading, error, reload, update } = useUsers();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleToggleActive = async (user: AdminUser) => {
    setBusyId(user.id);
    try {
      await update(user.id, { isActive: !user.isActive });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el usuario.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-widest uppercase">Usuarios</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {users.length} cuentas · operadores y compradores registrados
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

      {isLoading && <p className="mt-8 text-sm text-neutral-500">Cargando usuarios…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!isLoading && !error && (
        <div className="mt-6 overflow-x-auto border-y border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[10px] tracking-widest text-neutral-400 uppercase">
                <th className="py-3 pr-4 font-semibold">Usuario</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Teléfono</th>
                <th className="py-3 pr-4 font-semibold">Rol</th>
                <th className="py-3 pr-4 font-semibold">Estado</th>
                <th className="py-3 text-right font-semibold">Activo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="max-w-[200px] truncate py-3 pr-4 font-bold tracking-wide uppercase">
                    {user.fullName ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-xs text-neutral-500">{user.email}</td>
                  <td className="py-3 pr-4 text-xs text-neutral-500">{user.phone ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${ROLE_CLASS[role] ?? 'bg-neutral-100 text-neutral-600'}`}
                        >
                          {ROLE_LABEL[role] ?? role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      {user.isActive ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(user)}
                      disabled={busyId === user.id}
                      className="mx-auto flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase hover:border-black disabled:opacity-50"
                      aria-label={`${user.isActive ? 'Desactivar' : 'Activar'} cuenta de ${user.email}`}
                    >
                      {user.isActive ? (
                        <ToggleRight size={14} className="text-emerald-600" />
                      ) : (
                        <ToggleLeft size={14} className="text-neutral-400" />
                      )}
                      {user.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-neutral-500">
                    NO HAY USUARIOS.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-neutral-400 uppercase tracking-wider">
        <ShieldCheck size={14} /> La asignación de roles se hace desde la NOX & LUX API
        (`usuarios:gestionar`); este panel gestiona disponibilidad de acceso.
      </p>
    </div>
  );
}