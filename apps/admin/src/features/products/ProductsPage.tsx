import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Plus, Power } from 'lucide-react';
import type { Product } from '../../types';
import { MATERIAL_LABELS } from '../../constants';
import { useProducts } from './useProducts';
import { EditProductModal } from './EditProductModal';

/** Listado de productos con alta/baja de catálogo y edición (NL-06). */
export function ProductsPage() {
  const navigate = useNavigate();
  const { products, isLoading, error, toggleProductStatus, updateProduct } = useProducts();
  const [editing, setEditing] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const handleToggle = (id: string) => {
    void toggleProductStatus(id).then(() => showToast('ESTADO DE PRODUCTO ACTUALIZADO'));
  };

  const handleSave = async (product: Product) => {
    await updateProduct(product);
    setEditing(null);
    showToast('CAMBIOS GUARDADOS EN PRODUCTO');
  };

  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div>
      {toast && (
        <div className="animate-fade-in fixed right-4 top-4 z-50 bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-widest uppercase">Productos</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {products.length} totales · {activeCount} activos
          </p>
        </div>
        <Link
          to="/productos/nuevo"
          className="flex items-center gap-2 bg-black px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase hover:bg-neutral-800"
        >
          <Plus size={14} /> Nuevo
        </Link>
      </div>

      {isLoading && <p className="mt-8 text-sm text-neutral-500">Cargando productos…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!isLoading && !error && (
        <ul className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-4 py-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden bg-neutral-100">
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-wide uppercase">{product.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {MATERIAL_LABELS[product.material]} · {product.category}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  ${product.basePrice.toFixed(2)} · stock {product.variants[0]?.stock ?? 0}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase md:inline ${
                    product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle(product.id)}
                  aria-label={`Alternar estado de ${product.name}`}
                  className={`rounded-full border p-2 ${
                    product.isActive
                      ? 'border-neutral-300 text-neutral-500 hover:border-red-500 hover:text-red-600'
                      : 'border-emerald-600 text-emerald-700 hover:text-emerald-800'
                  }`}
                >
                  <Power size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(product)}
                  aria-label={`Editar ${product.name}`}
                  className="rounded-full border border-neutral-300 p-2 text-neutral-500 hover:border-black hover:text-black"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </li>
          ))}
          {products.length === 0 && (
            <li className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-sm text-neutral-500">NO HAY PRODUCTOS AÚN.</p>
              <button
                type="button"
                onClick={() => navigate('/productos/nuevo')}
                className="bg-black px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase"
              >
                Crear el primero
              </button>
            </li>
          )}
        </ul>
      )}

      {editing && <EditProductModal key={editing.id} product={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
    </div>
  );
}