import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import type { Material, Product, ProductImage } from '../../types';
import { CATEGORIES, MATERIAL_LABELS } from '../../constants';
import { ImageUploader } from '../../components/ImageUploader';
import { getMediaRepository } from '../../services/repositories';
import { useProducts } from './useProducts';

/**
 * Formulario de creación de producto (mismo comportamiento que el formulario
 * integrado del Store, NL-03). Desde NL-09 las imágenes suben a Media
 * (API/local) en vez de usar el simulador de muestras.
 */
export function NewProductPage() {
  const navigate = useNavigate();
  const { createProduct } = useProducts();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [price, setPrice] = useState('');
  const [material, setMaterial] = useState<Material>('STAINLESS_STEEL');
  const [size, setSize] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ProductImage[]>([]);

  const onRemoveImage = async (image: ProductImage) => {
    const key = image.url.split('/').pop();
    if (image.url.startsWith('/api/media/file/') && key) {
      try {
        await getMediaRepository().remove(key);
      } catch {
        // 409/404: el API orfanea al reemplazar la galería (best-effort).
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !price || !stock) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }
    const primary = images.find((img) => img.isPrimary) ?? images[0];
    const product: Product = {
      id: `prod-${Date.now()}`,
      name: name.toUpperCase(),
      category,
      basePrice: parseFloat(price),
      material,
      description: description || 'Bisutería fina de alta durabilidad.',
      isActive: true,
      imageUrl: primary?.url ?? '',
      images,
      variants: [
        {
          material,
          size: size || 'ÚNICA',
          stock: parseInt(stock, 10),
          priceOverride: parseFloat(price),
        },
      ],
    };
    void createProduct(product);
    navigate('/productos');
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/productos')}
        className="flex items-center gap-2 text-xs tracking-wider text-neutral-500 hover:text-black"
      >
        <ArrowLeft size={14} /> VOLVER
      </button>

      <h2 className="mt-4 text-lg font-bold tracking-widest uppercase">Nuevo producto</h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <ImageUploader images={images} onChange={setImages} onRemoveImage={onRemoveImage} />

        <label className="block">
          <span className="text-xs tracking-wider text-neutral-500">NOMBRE *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="EJ: ANILLO ORO DÚO"
            className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm uppercase outline-none focus:border-black"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs tracking-wider text-neutral-500">CATEGORÍA</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border-b border-neutral-300 bg-white py-2 text-sm uppercase outline-none focus:border-black"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs tracking-wider text-neutral-500">MATERIAL</span>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as Material)}
              className="mt-1 w-full border-b border-neutral-300 bg-white py-2 text-sm uppercase outline-none focus:border-black"
            >
              {(Object.keys(MATERIAL_LABELS) as Material[]).map((m) => (
                <option key={m} value={m}>
                  {MATERIAL_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs tracking-wider text-neutral-500">TALLA</span>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="ÚNICA"
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm uppercase outline-none focus:border-black"
            />
          </label>

          <label className="block">
            <span className="text-xs tracking-wider text-neutral-500">STOCK *</span>
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="10"
              type="number"
              min="0"
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs tracking-wider text-neutral-500">PRECIO BASE * (COP)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="80000"
            type="number"
            min="0"
            step="500"
            className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black"
          />
        </label>

        <label className="block">
          <span className="text-xs tracking-wider text-neutral-500">DESCRIPCIÓN</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full border border-neutral-300 bg-transparent p-3 text-sm outline-none focus:border-black"
          />
        </label>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 bg-black py-3 text-xs font-bold tracking-widest text-white uppercase hover:bg-neutral-800"
        >
          <Save size={14} /> Crear producto
        </button>
      </form>
    </div>
  );
}