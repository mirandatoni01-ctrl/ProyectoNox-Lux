import { useState, useMemo, type FormEvent } from 'react';
import { ShoppingBag, Search, Trash2, X, MessageCircle, Package, Grid, RefreshCw, User } from 'lucide-react';
import type { Material, Order, Product, Tab } from '../types';
import { CATEGORIES, MATERIAL_LABELS } from '../constants';
import { usePersistentStore } from '../hooks/usePersistentStore';
import { ApiError } from '../services/api/client';
import { useAuth, getAccessToken } from '../services/auth/AuthContext';
import ProfileView from './ProfileView';

export default function App() {
  const {
    products,
    cart,
    isLoading,
    isFromCache,
    error,
    cartTotal,
    cartItemsCount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    createOrder,
    refreshProducts,
  } = usePersistentStore();

  const { user } = useAuth();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<Tab>('catalog');

  // Filters
  const [materialFilter, setMaterialFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection / Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // --- CHECKOUT (NL-11: confirma el pedido contra POST /api/orders) ---
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // --- TOAST HELPER ---
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // --- FILTERED PRODUCTS ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;

      const matchesMaterial = materialFilter === 'ALL' || p.material === materialFilter;
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesMaterial && matchesCategory && matchesSearch;
    });
  }, [products, materialFilter, categoryFilter, searchQuery]);

  // --- CART CALCULATIONS ---
  // cartTotal y cartItemsCount provienen de usePersistentStore.

  // --- CART HANDLERS ---
  const handleAddToCart = (product: Product, variant: Product['variants'][number]) => {
    if (availableOf(variant) <= 0) {
      showToast('VARIANTE AGOTADA');
      return;
    }
    addToCart(product, variant);
    showToast(`AÑADIDO: ${product.name}`);
    setSelectedProduct(null);
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    updateQuantity(cartItemId, delta);
  };

  const handleRemoveItem = (cartItemId: string) => {
    removeItem(cartItemId);
    showToast('PRODUCTO ELIMINADO DEL CARRITO');
  };

  // --- WHATSAPP FALLBACK (offline): resumen local manual. Con conexión el
  //     whatsappLink lo construye el SERVIDOR (mensaje + número de negocio). ---
  const generateWhatsAppMessage = () => {
    let msg = `*NUEVO PEDIDO - NOX & LUX*\n`;
    msg += `-----------------------------------\n\n`;
    cart.forEach((item, i) => {
      msg += `${i + 1}. *${item.name}*\n`;
      msg += `   • Material: ${MATERIAL_LABELS[item.material as Material]}\n`;
      msg += `   • Variante/Medida: ${item.size}\n`;
      msg += `   • Cantidad: ${item.quantity}\n`;
      msg += `   • Subtotal: $${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    msg += `-----------------------------------\n`;
    msg += `*TOTAL A PAGAR:* $${cartTotal.toFixed(2)}\n\n`;
    msg += `Solicito confirmación de inventario e instrucciones para completar el pago y entrega.`;
    return msg;
  };

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;
  const fallbackWhatsappLink = `https://wa.me/${whatsappNumber ?? '573000000000'}?text=${encodeURIComponent(generateWhatsAppMessage())}`;

  // --- AVAILABILITY (NL-11): lo que puede comprarse = stock − reserved ---
  const availableOf = (variant: Product['variants'][number]): number =>
    (variant.stock ?? 0) - (variant.reserved ?? 0);

  // --- CHECKOUT (NL-11): confirma contra POST /api/orders (anónimo, total del
  //     SERVIDOR, reserva real de inventario). ---
  const openCheckout = () => {
    setCheckoutStep('form');
    setCheckoutError(null);
    setLastOrder(null);
    // NL-13: si el comprador está logueado, prefija nombre y teléfono de su perfil.
    if (user) {
      setCustomerName(user.fullName ?? customerName);
      setCustomerPhone(user.phone ?? customerPhone);
    }
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (!name) {
      setCheckoutError('Ingresa tu nombre');
      return;
    }
    if (!/^[0-9+]{8,20}$/.test(phone)) {
      setCheckoutError('Teléfono inválido: 8-20 dígitos, precedidos de + si aplica');
      return;
    }
    setCheckoutStep('submitting');
    setCheckoutError(null);
    try {
      const order = await createOrder({
        name,
        whatsappPhone: phone,
        items: cart.map((item) => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        })),
        // NL-13: vincula el pedido a la cuenta si el comprador está logueado.
        token: user ? (getAccessToken() ?? undefined) : undefined,
      });
      setLastOrder(order);
      setCheckoutStep('success');
      void refreshProducts();
    } catch (err) {
      setCheckoutStep('form');
      if (err instanceof ApiError && err.status === 409) {
        setCheckoutError('Stock insuficiente: el catálogo se actualizó; revisa cantidades disponibles.');
        void refreshProducts();
      } else if (err instanceof ApiError && err.status === 0) {
        setCheckoutError('Sin conexión: no se pudo crear el pedido. Guardaste tu carrito; podrás reintentar al reconectar, o confirmar manualmente por WhatsApp.');
      } else if (err instanceof ApiError && err.status === 400) {
        setCheckoutError(`Datos incorrectos: ${err.message}`);
      } else {
        setCheckoutError(err instanceof Error ? err.message : 'No se pudo crear el pedido');
      }
    }
  };

  const handleOpenWhatsApp = () => {
    clearCart();
    setIsCheckoutModalOpen(false);
    showToast('PEDIDO REGISTRADO');
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
        {/* TOP SYSTEM BAR — estado online (la gestión administrativa vive en el
            panel independiente apps/admin, ADR-NL-002/006) */}
        <div className="bg-black text-white px-4 py-2 flex items-center justify-between border-b border-neutral-800 text-[10px] tracking-wider uppercase">
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${isFromCache ? 'bg-amber-400' : 'bg-emerald-500'}`}
            ></span>
            <span>{isFromCache ? 'MODO SIN CONEXIÓN · CATÁLOGO GUARDADO' : 'NOX & LUX ONLINE'}</span>
          </div>

          <span className="text-neutral-400">CATÁLOGO ©</span>
        </div>

        {/* MAIN LUXURY HEADER */}
        <header className="bg-white border-b border-neutral-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-[0.25em] text-black">NOX & LUX</h1>
            <p className="text-[9px] tracking-[0.3em] text-neutral-500 uppercase font-medium">
              ESSENTIAL JEWELRY
            </p>
          </div>

          <div className="flex items-center gap-3">
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
          </div>
        </header>

        {/* BODY CONTAINER */}
        <main className="flex-1 overflow-y-auto bg-white pb-20">
          {/* LOADING STATE */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center gap-2 text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <p className="text-xs font-bold tracking-widest uppercase">Cargando datos...</p>
            </div>
          )}

          {/* ERROR BANNER */}
          {!isLoading && error && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-300 text-red-700 text-[10px] font-bold px-3 py-2 uppercase">
              Error: {error}
            </div>
          )}
          {/* CATALOG VIEW */}
          {activeTab === 'catalog' && (
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

              {/* MATERIAL FILTERS */}
              <div>
                <span className="text-[9px] font-bold tracking-widest text-neutral-400 block mb-2 uppercase">
                  MATERIALES
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {(Object.keys(MATERIAL_LABELS) as Material[]).map((mat) => (
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
                  <p className="text-xs font-bold tracking-widest uppercase">
                    No se encontraron productos
                  </p>
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
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-semibold">
                            {product.category}
                          </p>
                          <h3 className="text-xs font-bold text-black tracking-wide truncate uppercase mt-0.5">
                            {product.name}
                          </h3>
                          <p className="text-xs font-extrabold text-black mt-1">
                            ${product.basePrice.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 pt-0">
                        <button className="w-full bg-black text-white py-2 text-[10px] font-extrabold tracking-widest uppercase hover:bg-neutral-800 transition-colors">
                          VER DETALLE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CART VIEW */}
          {activeTab === 'cart' && (
            <div className="p-4 space-y-4">
              <div className="border-b border-neutral-200 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-extrabold tracking-widest uppercase text-black">
                    CARRITO DE COMPRAS
                  </h2>
                  <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
                    {cartItemsCount} ÍTEMS SELECCIONADOS
                  </p>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => clearCart()}
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
                    <div
                      key={item.id}
                      className="flex gap-3 border border-neutral-200 p-2.5 bg-neutral-50 items-center"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover border border-neutral-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold uppercase truncate">{item.name}</h4>
                        <p className="text-[9px] text-neutral-500 uppercase">
                          {MATERIAL_LABELS[item.material as Material]} | {item.size}
                        </p>
                        <p className="text-xs font-extrabold mt-1">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
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
                      <span className="font-bold tracking-widest uppercase text-neutral-500">
                        SUBTOTAL
                      </span>
                      <span className="font-extrabold">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold tracking-widest uppercase text-neutral-500">
                        ENVÍO
                      </span>
                      <span className="font-extrabold text-emerald-600">POR ACORDAR</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-neutral-200 pt-2">
                      <span className="font-black tracking-widest uppercase">TOTAL ESTIMADO</span>
                      <span className="font-black text-lg">${cartTotal.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() => openCheckout()}
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
        {/* PROFILE VIEW (NL-13) */}
          {activeTab === 'profile' && <ProfileView />}
        </main>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="bg-white border-t border-neutral-200 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex items-center justify-around py-2 z-40">
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

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold tracking-widest uppercase relative transition-all ${
              activeTab === 'profile' ? 'text-black' : 'text-neutral-400 hover:text-black'
            }`}
          >
            <User className="w-5 h-5" />
            <span>CUENTA</span>
          </button>
        </nav>

        {/* MODAL: PRODUCT DETAIL */}
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
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <span className="text-[9px] font-extrabold tracking-widest uppercase bg-black text-white px-2 py-0.5">
                  {MATERIAL_LABELS[selectedProduct.material]}
                </span>
                <h2 className="text-base font-black tracking-wider uppercase mt-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-lg font-black mt-1">
                  ${selectedProduct.basePrice.toFixed(2)}
                </p>
              </div>

              <div className="border-t border-neutral-200 pt-3">
                <p className="text-xs text-neutral-600 leading-relaxed uppercase">
                  {selectedProduct.description}
                </p>
              </div>

              {/* VARIANT / SIZE SELECTOR */}
              <div className="border-t border-neutral-200 pt-3">
                <label className="text-[10px] font-extrabold tracking-widest uppercase text-black block mb-2">
                  SELECCIONAR TALLA / MEDIDA
                </label>
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
                      {v.size} {availableOf(v) <= 0 && '(AGOTADO)'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() =>
                  handleAddToCart(selectedProduct, selectedProduct.variants[selectedVariantIndex])
                }
                disabled={availableOf(selectedProduct.variants[selectedVariantIndex]) <= 0}
                className="w-full bg-black text-white py-4 text-xs font-extrabold tracking-widest uppercase hover:bg-neutral-900 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {availableOf(selectedProduct.variants[selectedVariantIndex]) > 0
                  ? 'AÑADIR AL CARRITO'
                  : 'VARIANTE AGOTADA'}
              </button>
            </div>
          </div>
        )}

        {/* MODAL: CHECKOUT (NL-11) — crea el pedido en la API y confirma por
            WhatsApp con el enlace del servidor */}
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white text-black w-full max-w-sm border-2 border-black p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-black pb-2">
                <h3 className="text-xs font-extrabold tracking-widest uppercase flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 fill-white text-black" />
                  CONFIRMAR PEDIDO
                </h3>
                <button
                  onClick={() => {
                    if (checkoutStep !== 'submitting') setIsCheckoutModalOpen(false);
                  }}
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>

              {checkoutStep === 'form' && (
                <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold tracking-widest uppercase block mb-1">
                      NOMBRE
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full border border-neutral-300 px-3 py-2 text-xs uppercase focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold tracking-widest uppercase block mb-1">
                      WHATSAPP (código país + número)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ej. 573001234567"
                      className="w-full border border-neutral-300 px-3 py-2 text-xs focus:border-black focus:outline-none"
                    />
                  </div>

                  {checkoutError && (
                    <div className="bg-red-50 border border-red-300 text-red-700 text-[10px] font-bold px-3 py-2">
                      {checkoutError}
                      {checkoutError.startsWith('Sin conexión') && (
                        <a
                          href={fallbackWhatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline block mt-1.5"
                        >
                          ABRIR WHATSAPP PARA CONFIRMAR MANUALMENTE
                        </a>
                      )}
                    </div>
                  )}

                  <div className="border-t border-neutral-200 pt-3 flex justify-between items-center text-xs">
                    <span className="font-bold tracking-widest uppercase text-neutral-500">TOTAL</span>
                    <span className="font-black text-base">${cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-3.5 text-xs font-extrabold tracking-widest uppercase hover:bg-neutral-900 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-black" />
                    CONFIRMAR PEDIDO
                  </button>
                </form>
              )}

              {checkoutStep === 'submitting' && (
                <div className="py-12 text-center text-neutral-400 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-bold tracking-widest uppercase">Creando tu pedido...</p>
                  <p className="text-[9px] uppercase">Reservando inventario en tiempo real</p>
                </div>
              )}

              {checkoutStep === 'success' && lastOrder && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-bold px-3 py-2 uppercase text-center">
                    PEDIDO REGISTRADO · INVENTARIO RESERVADO
                  </div>
                  <div className="bg-neutral-100 border border-neutral-300 p-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500 uppercase font-bold tracking-wider">Pedido</span>
                      <span className="font-mono font-bold truncate">{lastOrder.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500 uppercase font-bold tracking-wider">Total (servidor)</span>
                      <span className="font-black">${lastOrder.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-neutral-500 uppercase text-center">
                    Tu carrito se abrirá al confirmar por WhatsApp para coordinar pago y entrega.
                  </p>
                  <a
                    href={lastOrder.whatsappLink ?? fallbackWhatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOpenWhatsApp}
                    className="w-full bg-black text-white py-3.5 text-xs font-extrabold tracking-widest uppercase text-center hover:bg-neutral-900 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-black" />
                    ABRIR WHATSAPP
                  </a>
                  <button
                    onClick={handleOpenWhatsApp}
                    className="w-full border border-black py-2.5 text-xs font-bold uppercase hover:bg-neutral-100"
                  >
                    HECHO
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}