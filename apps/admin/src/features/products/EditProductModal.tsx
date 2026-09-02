import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { Material, Product, ProductImage } from '../../types';
import { CATEGORIES, MATERIAL_LABELS } from '../../constants';
import { Modal } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { getMediaRepository } from '../../services/repositories';

interface Props {
  product: Product;
  onSave: (product: Product) => void;
  onClose: () => void;
}

/**
 * Modal de edición de producto. Se monta con `key={product.id}` (remount limpio).
 * Desde NL-09 la galería se gestiona con subidas reales a Media.
 */
export function EditProductModal({ product, onSave, onClose }: Props) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(String(product.basePrice));
  const [material, setMaterial] = useState<Material>(product.material);
  const [size, setSize] = useState(product.variants[0]?.size ?? '');
  const [stock, setStock] = useState(String(product.variants[0]?.stock ?? 0));
  const [description, setDescription] = useState(product.description);
  const [images, setImages] = useState<ProductImage[]>(
    product.images ??
      (product.imageUrl
        ? [{ id: `legacy-${product.id}`, url: product.imageUrl, isPrimary: true }]
        : []),
  );

  const onRemoveImage = async (image: ProductImage) => {
    const key = image.url.split('/').pop();
    if (image.url.startsWith('/api/media/file/') && key) {
      try {
        await getMediaRepository().remove(key);
      } catch {
        // 409/404: el API orfanea la imagen al guardar (best-effort).
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const primary = images.find((img) => img.isPrimary) ?? images[0];
    const updated: Product = {
      ...product,
      name: name.toUpperCase(),
      category,
      basePrice: parseFloat(price) || product.basePrice,
      material,
      description: description || product.description,
      imageUrl: primary?.url ?? '',
      images,
      variants: [
        {
          material,
          size: size || 'ÚNICA',
          stock: parseInt(stock, 10) || 0,
          priceOverride: parseFloat(price) || product.basePrice,
        },
      ],
    };
    onSave(updated);
  };

  return (
    <Modal open onClose={onClose} title="Editar producto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs tracking-wider text-neutral-500">NOMBRE</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm uppercase outline-none focus:border-black"
            />
          </label>

          <label className="block">
            <span className="text-xs tracking-wider text-neutral-500">STOCK</span>
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              type="number"
              min="0"
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs tracking-wider text-neutral-500">PRECIO BASE (COP)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            min="0"
            step="500"
            className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black"
          />
        </label>

        <ImageUploader images={images} onChange={setImages} onRemoveImage={onRemoveImage} />

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
          <Save size={14} /> Guardar cambios
        </button>
      </form>
    </Modal>
  );
}