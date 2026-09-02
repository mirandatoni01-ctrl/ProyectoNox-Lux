import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  User, 
  Search, 
  Plus, 
  Trash2, 
  Camera, 
  Check, 
  X, 
  ChevronLeft, 
  Filter, 
  ArrowRight, 
  Edit3, 
  Sliders, 
  ShieldCheck, 
  MessageCircle, 
  Eye, 
  EyeOff, 
  Package, 
  DollarSign, 
  Sparkles,
  RefreshCw,
  Phone,
  Grid,
  List
} from 'lucide-react';

// --- MOCK INITIAL DATA ---
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'ANILLO HELIOS LUX',
    category: 'anillos',
    basePrice: 45.00,
    material: 'COVERGOLD',
    description: 'Anillo geométrica con triple baño de Covergold de 24k. Acabado espejado de máxima durabilidad y diseño anatómico.',
    variants: [
      { material: 'COVERGOLD', size: 'Talla 6', stock: 12, priceOverride: 45.00 },
      { material: 'COVERGOLD', size: 'Talla 7', stock: 8, priceOverride: 45.00 },
      { material: 'COVERGOLD', size: 'Talla 8', stock: 0, priceOverride: 45.00 }
    ],
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'prod-2',
    name: 'CADENA CHOKER NOX',
    category: 'cadenas',
    basePrice: 62.00,
    material: 'STAINLESS_STEEL',
    description: 'Choker de eslabones pulidos en Acero Inoxidable 316L. Inalterable al agua, perfumes y sudor.',
    variants: [
      { material: 'STAINLESS_STEEL', size: '40 cm', stock: 15, priceOverride: 62.00 },
      { material: 'STAINLESS_STEEL', size: '45 cm', stock: 20, priceOverride: 62.00 }
    ],
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'prod-3',
    name: 'PULSERA EOS RHODIUM',
    category: 'pulseras',
    basePrice: 38.00,
    material: 'RHODIUM',
    description: 'Brazalete rígido articulado con recubrimiento electrolítico en Rodio blanco ultrabrillante.',
    variants: [
      { material: 'RHODIUM', size: 'Ajustable', stock: 6, priceOverride: 38.00 }
    ],
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1611591475140-be3617c97886?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'prod-4',
    name: 'ARETES ORBITA MINIMAL',
    category: 'aretes',
    basePrice: 28.00,
    material: 'COVERGOLD',
    description: 'Argollas tubulares ligeras con cierre de seguridad. Baño protector anti-alérgico en Covergold.',
    variants: [
      { material: 'COVERGOLD', size: '15 mm', stock: 18, priceOverride: 28.00 },
      { material: 'COVERGOLD', size: '20 mm', stock: 5, priceOverride: 32.00 }
    ],
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'prod-5',
    name: 'ANILLO SOMBRA MATTE',
    category: 'anillos',
    basePrice: 34.00,
    material: 'STAINLESS_STEEL',
    description: 'Banda ancha cepillada en acero inoxidable con bisel pulido brillante.',
    variants: [
      { material: 'STAINLESS_STEEL', size: 'Talla 8', stock: 14, priceOverride: 34.00 },
      { material: 'STAINLESS_STEEL', size: 'Talla 9', stock: 2, priceOverride: 34.00 }
    ],
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'prod-6',
    name: 'DIJE MEDALLA RODIO',
    category: 'cadenas',
    basePrice: 54.00,
    material: 'RHODIUM',
    description: 'Medallón grabado con patrón geométrico en acabado rodiado de alta intensidad visual.',
    variants: [
      { material: 'RHODIUM', size: '50 cm', stock: 9, priceOverride: 54.00 }
    ],
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600'
  }
];

const MATERIAL_LABELS = {
  ALL: 'TODOS',
  STAINLESS_STEEL: 'ACERO INOXIDABLE',
  COVERGOLD: 'COVERGOLD',
  RHODIUM: 'RODIO'
};

const CATEGORIES = [
  { id: 'ALL', name: 'TODAS' },
  { id: 'anillos', name: 'ANILLOS' },
  { id: 'cadenas', name: 'CADENAS' },
  { id: 'aretes', name: 'ARETES' },
  { id: 'pulseras', name: 'PULSERAS' }
];

export default function App() {
  // --- STATE ---
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' | 'ADMIN'
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'cart' | 'admin_products' | 'admin_add'
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cart, setCart] = useState([]);
  
  // Filters
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection / Modal States
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [toast, setToast] = useState(null);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('anillos');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdMaterial, setNewProdMaterial] = useState('STAINLESS_STEEL');
  const [newProdSize, setNewProdSize] = useState('Estándar');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState('https://images.unsplash.com/photo-1611591475140-be3617c97886?auto=format&fit=crop&q=80&w=600');

  // --- TOAST HELPER ---
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // --- FILTERED PRODUCTS ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // In Customer mode, only show active products
      if (role === 'CUSTOMER' && !p.isActive) return false;

      const matchesMaterial = materialFilter === 'ALL' || p.material === materialFilter;
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesMaterial && matchesCategory && matchesSearch;
    });
  }, [products, role, materialFilter, categoryFilter, searchQuery]);

  // --- CART CALCULATIONS ---
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // --- CART HANDLERS ---
  const handleAddToCart = (product, variant) => {
    const cartItemId = `${product.id}-${variant.material}-${variant.size}`;
    const price = variant.priceOverride || product.basePrice;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === cartItemId);
      if (existing) {
        return prevCart.map(item => 
          item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          material: variant.material,
          size: variant.size,
          price: price,
          quantity: 1,
          imageUrl: product.imageUrl
        }
      ];
    });

    showToast(`AÑADIDO: ${product.name}`);
    setSelectedProduct(null);
  };

  const handleUpdateQuantity = (cartItemId, delta) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (cartItemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== cartItemId));
    showToast('PRODUCTO ELIMINADO DEL CARRITO');
  };

  // --- WHATSAPP ORDER GENERATOR ---
  const generateWhatsAppMessage = () => {
    let msg = `*NUEVO PEDIDO - NOX & LUX*\n`;
    msg += `-----------------------------------\n\n`;
    cart.forEach((item, i) => {
      msg += `${i + 1}. *${item.name}*\n`;
      msg += `   • Material: ${MATERIAL_LABELS[item.material]}\n`;
      msg += `   • Variante/Medida: ${item.size}\n`;
      msg += `   • Cantidad: ${item.quantity}\n`;
      msg += `   • Subtotal: $${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    msg += `-----------------------------------\n`;
    msg += `*TOTAL A PAGAR:* $${cartTotal.toFixed(2)}\n\n`;
    msg += `Solicito confirmación de inventario e instrucciones para completar el pago y entrega.`;
    return msg;
  };

  const whatsappLink = `https://wa.me/573000000000?text=${encodeURIComponent(generateWhatsAppMessage())}`;

  // --- ADMIN HANDLERS ---
  const handleToggleProductStatus = (productId) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, isActive: !p.isActive } : p
    ));
    showToast('ESTADO DE PRODUCTO ACTUALIZADO');
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdStock) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      name: newProdName.toUpperCase(),
      category: newProdCategory,
      basePrice: parseFloat(newProdPrice),
      material: newProdMaterial,
      description: newProdDesc || 'Bisutería fina de alta durabilidad.',
      isActive: true,
      imageUrl: newProdImage,
      variants: [
        {
          material: newProdMaterial,
          size: newProdSize,
          stock: parseInt(newProdStock, 10),
          priceOverride: parseFloat(newProdPrice)
        }
      ]
    };

    setProducts([newProduct, ...products]);
    showToast('PRODUCTO CREADO EXITOSAMENTE');

    // Reset Form
    setNewProdName('');
    setNewProdPrice('');
    setNewProdDesc('');
    setActiveTab('admin_products');
  };

  const handleSaveEditProduct = () => {
    if (!editingProduct) return;
    setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
    setIsEditModalOpen(false);
    setEditingProduct(null);
    showToast('CAMBIOS GUARDADOS EN PRODUCTO');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-start p-0 md:p-4 select-none">
      
      {/* --- FLOATING TOAST --- */}
      {toast && (
        <div className="fixed top-4 z-50 bg-white text-black text-xs font-bold tracking-widest px-6 py-3 border border-black shadow-2xl animate-bounce uppercase">
          {toast}
        </div>
      )}

      {/* --- APP CONTAINER (MOBILE SIMULATOR FOR DESKTOP) --- */}
      <div className="w-full max-w-md bg-white text-black min-h-screen md:min-h-[850px] md:max-h-[900px] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-neutral-800">
        
        {/* TOP SYSTEM BAR & ROLE SWITCHER */}
        <div className="bg-black text-white px-4 py-2 flex items-center justify-between border-b border-neutral-800 text-[10px] tracking-wider uppercase">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>NOX & LUX ONLINE</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400">ROL:</span>
            <button 
              onClick={() => {
                const nextRole = role === 'CUSTOMER' ? 'ADMIN' : 'CUSTOMER';
                setRole(nextRole);
                setActiveTab(nextRole === 'ADMIN' ? 'admin_products' : 'catalog');
                showToast(`MODO: ${nextRole === 'ADMIN' ? 'ADMINISTRADOR' : 'COMPRADOR'}`);
              }}
              className="bg-white text-black font-extrabold px-2 py-0.5 text-[9px] hover:bg-neutral-200 transition-colors uppercase flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" />
              {role === 'CUSTOMER' ? 'CAMBIAR A ADMIN' : 'CAMBIAR A COMPRADOR'}
            </button>
          </div>
        </div>

        {/* MAIN LUXURY HEADER */}
        <header className="bg-white border-b border-neutral-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-[0.25em] text-black">NOX & LUX</h1>
            <p className="text-[9px] tracking-[0.3em] text-neutral-500 uppercase font-medium">ESSENTIAL JEWELRY</p>
          </div>

          <div className="flex items-center gap-3">
            {role === 'CUSTOMER' && (
              <button 
                onClick={() => setActiveTab('cart')} 
                className="relative p-2 hover:bg-neutral-100 transition-colors"
                aria-label="Carrito"
              >
                <ShoppingBag className="w-6 h-6 text-black" />
                {cartItemsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        {/* BODY CONTAINER */}
        <main className="flex-1 overflow-y-auto bg-white pb-20">

          {/* ========================================================= */}
          {/* CUSTOMER: CATALOG VIEW                                   */}
          {/* ========================================================= */}
          {role === 'CUSTOMER' && activeTab === 'catalog' && (
            <div className="p-4 space-y-4">
              
              {/* SEARCH BAR */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="BUSCAR JOYAS, CADENAS, ANILLOS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition-colors uppercase font-medium"
                />
              </div>

              {/* MATERIAL FILTERS (STAINLESS, COVERGOLD, RHODIUM) */}
              <div>
                <span className="text-[9px] font-bold tracking-widest text-neutral-400 block mb-2 uppercase">MATERIALES</span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {Object.keys(MATERIAL_LABELS).map((mat) => (
                    <button
                      key={mat}
                      onClick={() => setMaterialFilter(mat)}
                      className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase border transition-all whitespace-nowrap ${
                        materialFilter === mat 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-black border-neutral-200 hover:border-black'
                      }`}
                    >
                      {MATERIAL_LABELS[mat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* CATEGORY FILTERS */}
              <div className="flex gap-2 border-b border-neutral-200 pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`text-[10px] font-bold tracking-widest pb-1 border-b-2 uppercase transition-all ${
                      categoryFilter === cat.id 
                        ? 'border-black text-black' 
                        : 'border-transparent text-neutral-400 hover:text-black'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* PRODUCT GRID */}
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-neutral-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold tracking-widest uppercase">No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedVariantIndex(0);
                      }}
                      className="group border border-neutral-200 bg-neutral-50 hover:border-black transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-full h-40 bg-neutral-200 overflow-hidden relative">
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <span className="absolute top-2 left-2 bg-black text-white text-[8px] font-extrabold px-1.5 py-0.5 tracking-wider uppercase">
                            {MATERIAL_LABELS[product.material]}
                          </span>
                        </div>

                        <div className="p-2.5">
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">{product.category}</p>
                          <h3 className="text-xs font-bold text-black tracking-wide truncate uppercase mt-0.5">{product.name}</h3>
                          <p className="text-xs font-extrabold text-black mt-1">${product.basePrice.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="p-2.5 pt-0">
                        <button 
                          className="w-full bg-black text-white py-2 text-[10px] font-extrabold tracking-widest uppercase hover:bg-neutral-800 transition-colors"
                        >
                          VER DETALLE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* CUSTOMER: CART VIEW                                      */}
          {/* ========================================================= */}
          {role === 'CUSTOMER' && activeTab === 'cart' && (
            <div className="p-4 space-y-4">
              <div className="border-b border-neutral-200 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-black">CARRITO DE COMPRAS</h2>
                  <p className="text-[10px] text-neutral-400 tracking-wider uppercase">{cartItemsCount} ÍTEMS SELECCIONADOS</p>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={() => setCart([])}
                    className="text-[10px] font-bold text-neutral-400 hover:text-black uppercase underline"
                  >
                    VACIAR
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-20 text-center text-neutral-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 mx-auto stroke-1" />
                  <p className="text-xs font-bold tracking-widest uppercase">Tu carrito está vacío</p>
                  <button 
                    onClick={() => setActiveTab('catalog')}
                    className="bg-black text-white text-[10px] font-bold px-6 py-3 tracking-widest uppercase inline-block"
                  >
                    EXPLORAR CATÁLOGO
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 border border-neutral-200 p-2.5 bg-neutral-50 items-center">
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover border border-neutral-200" />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold uppercase truncate">{item.name}</h4>
                        <p className="text-[9px] text-neutral-500 uppercase">{MATERIAL_LABELS[item.material]} | {item.size}</p>
                        <p className="text-xs font-extrabold mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center border border-black bg-white">
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="px-2 py-0.5 text-xs font-bold hover:bg-neutral-100"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-extrabold">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="px-2 py-0.5 text-xs font-bold hover:bg-neutral-100"
                          >
                            +
                          </button>
                        </div>

                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-neutral-400 hover:text-black p-1"
                          aria-label="Eliminar ítem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* SUMMARY & CHECKOUT BUTTON */}
                  <div className="border-t border-black pt-4 mt-6 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold tracking-widest uppercase text-neutral-500">SUBTOTAL</span>
                      <span className="font-extrabold">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold tracking-widest uppercase text-neutral-500">ENVÍO</span>
                      <span className="font-extrabold text-emerald-600">POR ACORDAR</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-neutral-200 pt-2">
                      <span className="font-black tracking-widest uppercase">TOTAL ESTIMADO</span>
                      <span className="font-black text-lg">${cartTotal.toFixed(2)}</span>
                    </div>

                    <button 
                      onClick={() => setIsWhatsAppModalOpen(true)}
                      className="w-full bg-black text-white py-4 text-xs font-extrabold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-neutral-900 transition-colors shadow-lg"
                    >
                      <MessageCircle className="w-4 h-4 fill-white text-black" />
                      COMPRAR VÍA WHATSAPP
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ADMIN: INVENTORY MANAGEMENT                               */}
          {/* ========================================================= */}
          {role === 'ADMIN' && activeTab === 'admin_products' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <div>
                  <h2 className="text-sm font-extrabold tracking-widest uppercase">GESTIÓN DE CATÁLOGO</h2>
                  <p className="text-[10px] text-neutral-400 tracking-wider uppercase">{products.length} PRODUCTOS REGISTRADOS</p>
                </div>
                <button 
                  onClick={() => setActiveTab('admin_add')}
                  className="bg-black text-white text-[10px] font-extrabold px-3 py-2 tracking-widest uppercase flex items-center gap-1 hover:bg-neutral-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  NUEVO
                </button>
              </div>

              {/* ADMIN PRODUCT LIST */}
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p.id} className="border border-neutral-200 p-3 bg-neutral-50 flex items-center justify-between gap-3">
                    <img src={p.imageUrl} alt={p.name} className="w-14 h-14 object-cover border border-neutral-200" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase truncate">{p.name}</h4>
                        {!p.isActive && (
                          <span className="bg-neutral-300 text-black text-[8px] font-extrabold px-1.5 py-0.5 uppercase">OCULTO</span>
                        )}
                      </div>
                      <p className="text-[9px] text-neutral-500 uppercase">{MATERIAL_LABELS[p.material]} | {p.category}</p>
                      <p className="text-xs font-extrabold mt-0.5">${p.basePrice.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleProductStatus(p.id)}
                        className={`p-2 border ${p.isActive ? 'border-black text-black bg-white' : 'border-neutral-300 text-neutral-400'}`}
                        title={p.isActive ? "Ocultar del catálogo" : "Publicar en catálogo"}
                      >
                        {p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <button 
                        onClick={() => {
                          setEditingProduct({ ...p });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 border border-black bg-black text-white hover:bg-neutral-800"
                        title="Editar producto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ADMIN: CREATE PRODUCT FORM                                */}
          {/* ========================================================= */}
          {role === 'ADMIN' && activeTab === 'admin_add' && (
            <form onSubmit={handleCreateProduct} className="p-4 space-y-4">
              <div className="border-b border-neutral-200 pb-2">
                <h2 className="text-sm font-extrabold tracking-widest uppercase">REGISTRAR NUEVA PRENDA</h2>
                <p className="text-[10px] text-neutral-400 uppercase">Añade fotos desde la cámara/galería e ingresa los precios</p>
              </div>

              {/* IMAGE UPLOAD SIMULATOR */}
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">FOTOGRAFÍA DEL PRODUCTO</label>
                <div className="border border-dashed border-neutral-400 p-4 text-center bg-neutral-50 space-y-2">
                  <img src={newProdImage} alt="Preview" className="w-24 h-24 object-cover mx-auto border border-black" />
                  <div className="flex justify-center gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        const sampleImages = [
                          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
                          'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
                          'https://images.unsplash.com/photo-1611591475140-be3617c97886?auto=format&fit=crop&q=80&w=600',
                          'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=600'
                        ];
                        const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
                        setNewProdImage(randomImg);
                        showToast('IMAGEN SIMULADA CAPTURADA');
                      }}
                      className="bg-black text-white px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      SIMULAR CÁMARA
                    </button>
                  </div>
                </div>
              </div>

              {/* NAME */}
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">NOMBRE DE LA PRENDA *</label>
                <input 
                  type="text" 
                  required
                  placeholder="EJ: ANILLO AURA GOLD"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full border border-neutral-300 p-2.5 text-xs text-black uppercase focus:outline-none focus:border-black"
                />
              </div>

              {/* MATERIAL & CATEGORY */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">MATERIAL *</label>
                  <select 
                    value={newProdMaterial}
                    onChange={(e) => setNewProdMaterial(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 text-xs text-black uppercase focus:outline-none focus:border-black bg-white"
                  >
                    <option value="STAINLESS_STEEL">ACERO INOXIDABLE</option>
                    <option value="COVERGOLD">COVERGOLD</option>
                    <option value="RHODIUM">RODIO</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">CATEGORÍA *</label>
                  <select 
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 text-xs text-black uppercase focus:outline-none focus:border-black bg-white"
                  >
                    <option value="anillos">ANILLOS</option>
                    <option value="cadenas">CADENAS</option>
                    <option value="aretes">ARETES</option>
                    <option value="pulseras">PULSERAS</option>
                  </select>
                </div>
              </div>

              {/* PRICE & STOCK */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">PRECIO BASE ($) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="45.00"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 text-xs text-black uppercase focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">STOCK INICIAL *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="10"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full border border-neutral-300 p-2.5 text-xs text-black uppercase focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* SIZE / VARIANTS */}
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">MEDIDA / VARIANTE INICIAL</label>
                <input 
                  type="text" 
                  placeholder="EJ: TALLA 7 / 45 CM / AJUSTABLE"
                  value={newProdSize}
                  onChange={(e) => setNewProdSize(e.target.value)}
                  className="w-full border border-neutral-300 p-2.5 text-xs text-black uppercase focus:outline-none focus:border-black"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-black block mb-1">DESCRIPCIÓN</label>
                <textarea 
                  rows={3}
                  placeholder="Detalles del baño, acabados y recomendaciones..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full border border-neutral-300 p-2.5 text-xs text-black uppercase focus:outline-none focus:border-black"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white py-3.5 text-xs font-extrabold tracking-widest uppercase hover:bg-neutral-900 transition-colors"
              >
                PUBLICAR PRODUCTO EN CATÁLOGO
              </button>
            </form>
          )}

        </main>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="bg-white border-t border-neutral-200 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex items-center justify-around py-2 z-40">
          {role === 'CUSTOMER' ? (
            <>
              <button 
                onClick={() => setActiveTab('catalog')}
                className={`flex flex-col items-center gap-1 text-[9px] font-bold tracking-widest uppercase transition-all ${
                  activeTab === 'catalog' ? 'text-black' : 'text-neutral-400 hover:text-black'
                }`}
              >
                <Grid className="w-5 h-5" />
                <span>CATÁLOGO</span>
              </button>

              <button 
                onClick={() => setActiveTab('cart')}
                className={`flex flex-col items-center gap-1 text-[9px] font-bold tracking-widest uppercase relative transition-all ${
                  activeTab === 'cart' ? 'text-black' : 'text-neutral-400 hover:text-black'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>CARRITO</span>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 right-2 bg-black text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('admin_products')}
                className={`flex flex-col items-center gap-1 text-[9px] font-bold tracking-widest uppercase transition-all ${
                  activeTab === 'admin_products' ? 'text-black' : 'text-neutral-400 hover:text-black'
                }`}
              >
                <List className="w-5 h-5" />
                <span>INVENTARIO</span>
              </button>

              <button 
                onClick={() => setActiveTab('admin_add')}
                className={`flex flex-col items-center gap-1 text-[9px] font-bold tracking-widest uppercase transition-all ${
                  activeTab === 'admin_add' ? 'text-black' : 'text-neutral-400 hover:text-black'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>NUEVO PRODUCTO</span>
              </button>
            </>
          )}
        </nav>

        {/* ========================================================= */}
        {/* MODAL: PRODUCT DETAIL                                     */}
        {/* ========================================================= */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center md:items-center p-0 md:p-4 animate-fade-in">
            <div className="bg-white text-black w-full max-w-md max-h-[90vh] overflow-y-auto border border-black p-5 space-y-4 relative">
              
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-1 border border-black bg-white hover:bg-neutral-100"
              >
                <X className="w-5 h-5 text-black" />
              </button>

              <div className="w-full h-64 bg-neutral-100 overflow-hidden border border-neutral-200 mt-2">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>

              <div>
                <span className="text-[9px] font-extrabold tracking-widest uppercase bg-black text-white px-2 py-0.5">
                  {MATERIAL_LABELS[selectedProduct.material]}
                </span>
                <h2 className="text-base font-black tracking-wider uppercase mt-2">{selectedProduct.name}</h2>
                <p className="text-lg font-black mt-1">${selectedProduct.basePrice.toFixed(2)}</p>
              </div>

              <div className="border-t border-neutral-200 pt-3">
                <p className="text-xs text-neutral-600 leading-relaxed uppercase">{selectedProduct.description}</p>
              </div>

              {/* VARIANT / SIZE SELECTOR */}
              <div className="border-t border-neutral-200 pt-3">
                <label className="text-[10px] font-extrabold tracking-widest uppercase text-black block mb-2">SELECCIONAR TALLA / MEDIDA</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.variants.map((v, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedVariantIndex(index)}
                      className={`px-3 py-1.5 text-xs font-bold border uppercase transition-all ${
                        selectedVariantIndex === index 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-black border-neutral-300 hover:border-black'
                      }`}
                    >
                      {v.size} {v.stock <= 0 && '(AGOTADO)'}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => handleAddToCart(selectedProduct, selectedProduct.variants[selectedVariantIndex])}
                disabled={selectedProduct.variants[selectedVariantIndex]?.stock <= 0}
                className="w-full bg-black text-white py-4 text-xs font-extrabold tracking-widest uppercase hover:bg-neutral-900 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {selectedProduct.variants[selectedVariantIndex]?.stock > 0 ? 'AÑADIR AL CARRITO' : 'VARIANTE AGOTADA'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: WHATSAPP ORDER PREVIEW                             */}
        {/* ========================================================= */}
        {isWhatsAppModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black w-full max-w-sm border-2 border-black p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-black pb-2">
                <h3 className="text-xs font-extrabold tracking-widest uppercase flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  CONFIRMAR PEDIDO VÍA WHATSAPP
                </h3>
                <button onClick={() => setIsWhatsAppModalOpen(false)}>
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>

              <div className="bg-neutral-100 p-3 font-mono text-[10px] leading-relaxed border border-neutral-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {generateWhatsAppMessage()}
              </div>

              <p className="text-[9px] text-neutral-500 uppercase">
                Al hacer clic, se abrirá la app de WhatsApp con este resumen listo para enviar a nuestro equipo de ventas.
              </p>

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="flex-1 border border-black py-2.5 text-xs font-bold uppercase hover:bg-neutral-100"
                >
                  CANCELAR
                </button>
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="flex-1 bg-black text-white py-2.5 text-xs font-extrabold uppercase text-center hover:bg-neutral-900 flex items-center justify-center gap-1"
                >
                  ABRIR WHATSAPP
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: ADMIN EDIT PRODUCT                                 */}
        {/* ========================================================= */}
        {isEditModalOpen && editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black w-full max-w-sm border-2 border-black p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-black pb-2">
                <h3 className="text-xs font-extrabold tracking-widest uppercase">EDITAR PRODUCTO</h3>
                <button onClick={() => setIsEditModalOpen(false)}>
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase block mb-1">NOMBRE</label>
                <input 
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full border border-neutral-300 p-2 text-xs uppercase"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase block mb-1">PRECIO BASE ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={editingProduct.basePrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, basePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-neutral-300 p-2 text-xs uppercase"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase block mb-1">DESCRIPCIÓN</label>
                <textarea 
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full border border-neutral-300 p-2 text-xs uppercase"
                />
              </div>

              <button 
                onClick={handleSaveEditProduct}
                className="w-full bg-black text-white py-3 text-xs font-extrabold tracking-widest uppercase hover:bg-neutral-900"
              >
                GUARDAR CAMBIOS
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}