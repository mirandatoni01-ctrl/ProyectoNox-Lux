import { NavLink, Outlet } from 'react-router-dom';
import { Boxes, Gem, LogOut, MessageSquare, Package, ShoppingBag, Users } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import type { AdminModule } from '../types';

interface NavItem {
  module: AdminModule;
  label: string;
  to: string;
  icon: typeof Boxes;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { module: 'productos', label: 'Productos', to: '/productos', icon: Package },
  { module: 'inventario', label: 'Inventario', to: '/inventario', icon: Boxes },
  { module: 'media', label: 'Media', to: '/media', icon: Gem },
  { module: 'pedidos', label: 'Pedidos', to: '/pedidos', icon: ShoppingBag },
  { module: 'clientes', label: 'Clientes', to: '/clientes', icon: Users, comingSoon: true },
  { module: 'usuarios', label: 'Usuarios', to: '/usuarios', icon: Users },
  { module: 'tickets', label: 'Tickets', to: '/tickets', icon: MessageSquare },
];

/** Shell de escritorio del Admin: barra lateral + cabecera de sesión + contenido. */
export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-black text-white md:flex">
        <div className="px-6 py-8">
          <p className="text-[10px] tracking-[0.4em] text-neutral-400">NOX &amp; LUX</p>
          <p className="mt-1 text-sm font-bold tracking-widest uppercase">Admin panel</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.module}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2.5 text-xs font-semibold tracking-wider uppercase transition ${
                  isActive ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
              {item.comingSoon && (
                <span className="ml-auto rounded-full border border-neutral-700 px-2 py-0.5 text-[9px] tracking-widest">
                  PRONTO
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-800 p-6">
          <p className="truncate text-xs font-bold tracking-wide">{user?.email}</p>
          <p className="mt-1 truncate text-[10px] tracking-widest text-neutral-500 uppercase">
            {user?.roles.join(', ') ?? 'sin rol'}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-4 flex w-full items-center justify-center gap-2 border border-neutral-700 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-neutral-900"
          >
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 md:hidden">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase">NOX &amp; LUX</p>
            <p className="text-[10px] tracking-widest text-neutral-400 uppercase">Admin panel</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="max-w-[120px] truncate text-[10px] tracking-wider text-neutral-500 uppercase">
              {user?.email}
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-neutral-300 p-2 text-neutral-500"
              aria-label="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-white px-3 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.module}
              to={item.to}
              className={({ isActive }) =>
                `shrink-0 rounded px-3 py-2 text-[10px] font-bold tracking-widest uppercase ${
                  isActive ? 'bg-black text-white' : 'text-neutral-500'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}