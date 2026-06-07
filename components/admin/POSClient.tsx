'use client';
// components/admin/POSClient.tsx
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, ShoppingCart, Plus, Minus, Trash2, Printer, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types';

interface Props {
  initialProducts: Product[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer details and Mode Toggles
  const [customerMode, setCustomerMode] = useState<'walk-in' | 'existing'>('walk-in');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showEmailField, setShowEmailField] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerOrderCount, setCustomerOrderCount] = useState<number | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'QR'>('Cash');

  // Checkout Success / Receipt State
  const [completing, setCompleting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Cashier State
  const [cashier, setCashier] = useState<{ id: string; name: string } | null>(null);

  // Mobile/Tablet state
  const [posTab, setPosTab] = useState<'products' | 'cart'>('products');

  // Focus ref
  const newSaleBtnRef = useRef<HTMLButtonElement>(null);

  const supabase = createClient();

  // Load Categories & Cashier info
  useEffect(() => {
    const cats = Array.from(new Set(initialProducts.map(p => p.category).filter(Boolean))) as string[];
    setCategories(['All', ...cats]);

    const fetchCashier = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setCashier({
          id: user.id,
          name: profile?.full_name || user.email || 'Cashier'
        });
      }
    };
    fetchCashier();
  }, [initialProducts, supabase]);

  // Auto-focus New Sale button when receipt is shown
  useEffect(() => {
    if (showReceipt && newSaleBtnRef.current) {
      newSaleBtnRef.current.focus();
    }
  }, [showReceipt]);

  // Synthetic luxury chime sound using Web Audio API
  const playSuccessChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.error('Audio chime failed:', e);
    }
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + 1, product.quantity);
        if (newQty === existing.quantity) {
          alert(`Cannot add more. Only ${product.quantity} units in stock.`);
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.quantity) {
            alert(`Only ${item.product.quantity} units available.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCustomerPhoneSearch = async () => {
    if (!customerPhone.trim()) return;
    setSearchingCustomer(true);
    setSearchFeedback('');
    setCustomerOrderCount(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('phone', customerPhone.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomerName(data.full_name || '');
        setCustomerEmail(data.email || '');
        setCustomerId(data.id);
        setSearchFeedback('Customer found!');

        // Fetch order history count
        const { count, error: countError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.id);

        if (!countError && count !== null) {
          setCustomerOrderCount(count);
        } else {
          setCustomerOrderCount(0);
        }
      } else {
        setSearchFeedback('No customer found. Try another number or enter manually.');
        setCustomerId(null);
        setCustomerName('');
        setCustomerEmail('');
      }
    } catch (err: any) {
      setSearchFeedback('Search failed. Enter details manually.');
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please fill in Customer Name and Phone.');
      return;
    }

    setCompleting(true);

    try {
      const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const total = subtotal; // delivery_charge is 0 for POS

      // Handle email validation for Walk-in (since DB order email field is NOT NULL)
      const emailForOrder = customerEmail.trim() || `walkin-${customerPhone.trim()}@chrishflora.lk`;

      // 1. Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: customerMode === 'walk-in' ? null : customerId,
          customer_name: customerName,
          customer_email: emailForOrder,
          customer_phone: customerPhone,
          fulfillment_method: 'Store Pickup',
          delivery_charge: 0,
          subtotal,
          total,
          status: 'Confirmed',
          order_note: orderNote || null,
          cashier_id: cashier?.id || null,
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create the order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Decrement stock for each item using RPC
      for (const item of cart) {
        const { error: rpcError } = await supabase.rpc('decrement_stock', {
          p_product_id: item.product.id,
          p_quantity: item.quantity
        });
        if (rpcError) console.error(`RPC stock decrement failed:`, rpcError);
      }

      // 4. Update local stock quantities
      setProducts(prev => {
        return prev.map(p => {
          const cartItem = cart.find(item => item.product.id === p.id);
          if (cartItem) {
            return { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) };
          }
          return p;
        });
      });

      // Play sound chime
      playSuccessChime();

      // 5. Store order for the receipt modal
      setCreatedOrder({
        ...order,
        items: cart
      });
      setShowReceipt(true);
    } catch (err: any) {
      alert(`Error completing checkout: ${err.message}`);
    } finally {
      setCompleting(false);
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerEmail('');
    setShowEmailField(false);
    setCustomerId(null);
    setCustomerOrderCount(null);
    setSearchFeedback('');
    setOrderNote('');
    setPaymentMethod('Cash');
    setCreatedOrder(null);
    setShowReceipt(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-gray-50 font-sans">
      {/* Mobile Sticky Tab Bar */}
      <div className="md:hidden flex bg-white border-b border-gray-200 sticky top-0 z-20 shrink-0">
        <button
          onClick={() => setPosTab('products')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all
            ${posTab === 'products'
              ? 'border-gold-500 text-gold-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Products ({filteredProducts.length})
        </button>
        <button
          onClick={() => setPosTab('cart')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all relative
            ${posTab === 'cart'
              ? 'border-gold-500 text-gold-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Cart
          {cart.length > 0 && (
            <span className="ml-1.5 bg-gold-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Left Panel - Product Catalog */}
      <div className={`flex-col h-full min-w-0 md:w-[60%] lg:w-auto lg:flex-1 ${posTab === 'products' ? 'flex' : 'hidden md:flex'}`}>
        {/* Filters Top Bar */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gold-500 text-sm text-gray-800"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-500 hover:text-gray-800 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Categories Scrollable Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${selectedCategory === cat
                    ? 'bg-gold-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Container */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p className="text-lg font-serif">No products found</p>
              <p className="text-xs">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(p => {
                const outOfStock = p.quantity <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => !outOfStock && addToCart(p)}
                    className={`bg-white rounded border overflow-hidden flex flex-col cursor-pointer transition-all duration-200 group relative
                      ${outOfStock 
                        ? 'opacity-50 cursor-not-allowed border-gray-200' 
                        : 'border-gray-200 hover:border-gold-500 hover:shadow-md'}`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-square w-full bg-gray-100">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-serif text-sm">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Product Meta */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serif text-sm text-flora-brown font-semibold line-clamp-1 group-hover:text-gold-600 transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.sku}</p>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-serif text-sm text-flora-brown font-semibold">
                          LKR {p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        
                        {/* Stock status indicator badge */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-medium uppercase tracking-wider
                          ${outOfStock
                            ? 'bg-red-100 text-red-700'
                            : p.quantity <= 5
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'}`}
                        >
                          {outOfStock ? 'OOS' : `${p.quantity} Units`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart Sidebar */}
      <div className={`bg-flora-brown text-flora-cream flex flex-col h-full shrink-0 border-l border-white/5 shadow-2xl transition-all duration-200 w-full md:w-[40%] lg:w-96 ${posTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
        {/* Cart Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-gold-400" />
            <h2 className="font-serif text-lg font-semibold tracking-wide">POS Cart</h2>
          </div>
          <span className="bg-white/15 px-2 py-0.5 rounded text-xs font-mono">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
          </span>
        </div>

        {/* Scrollable Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-flora-cream/40 py-12">
              <ShoppingCart size={40} className="stroke-[1] mb-2" />
              <p className="font-serif text-sm">Cart is empty</p>
              <p className="text-[10px]">Click products on the left to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-white/5 border border-white/10 p-3 rounded space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-serif text-sm font-medium leading-snug line-clamp-2">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] text-flora-cream/50 font-mono mt-0.5">
                      {item.product.sku}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-flora-cream/50 hover:text-red-400 p-0.5 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-white/10 rounded">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="px-2 py-1 hover:bg-white/10 transition-colors rounded-l"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="px-2 py-1 hover:bg-white/10 transition-colors rounded-r"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[10px] text-flora-cream/50 font-mono">
                      LKR {item.product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} ea
                    </p>
                    <p className="font-mono text-xs text-gold-300 font-semibold mt-0.5">
                      LKR {(item.product.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer & Payment Form Area */}
        <div className="border-t border-white/10 p-4 pb-safe space-y-4 bg-black/10 shrink-0">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-flora-cream/60 font-medium block mb-1.5">
              Customer Mode
            </label>
            
            {/* Mode Selectors */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('walk-in');
                  setCustomerPhone('');
                  setCustomerName('');
                  setCustomerEmail('');
                  setCustomerId(null);
                  setCustomerOrderCount(null);
                  setSearchFeedback('');
                }}
                className={`flex-1 py-1 border text-[10px] rounded transition-all font-semibold uppercase tracking-wider
                  ${customerMode === 'walk-in'
                    ? 'bg-gold-500 border-gold-500 text-white'
                    : 'border-white/10 hover:bg-white/5 text-flora-cream/80'}`}
              >
                Walk-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('existing');
                  setCustomerPhone('');
                  setCustomerName('');
                  setCustomerEmail('');
                  setCustomerId(null);
                  setCustomerOrderCount(null);
                  setSearchFeedback('');
                }}
                className={`flex-1 py-1 border text-[10px] rounded transition-all font-semibold uppercase tracking-wider
                  ${customerMode === 'existing'
                    ? 'bg-gold-500 border-gold-500 text-white'
                    : 'border-white/10 hover:bg-white/5 text-flora-cream/80'}`}
              >
                Existing
              </button>
            </div>
          </div>

          {/* Form Fields depend on Mode */}
          {customerMode === 'existing' ? (
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-flora-cream/60 font-medium block">
                Existing Customer Lookup
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Phone search..."
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded focus:outline-none focus:ring-1 focus:ring-gold-500 placeholder-white/30"
                />
                <button
                  type="button"
                  onClick={handleCustomerPhoneSearch}
                  disabled={searchingCustomer}
                  className="bg-gold-500 hover:bg-gold-600 disabled:bg-gold-800 text-white text-[10px] font-semibold px-3 py-1.5 rounded transition-colors shrink-0 uppercase tracking-wider"
                >
                  {searchingCustomer ? '...' : 'Search'}
                </button>
              </div>
              
              {searchFeedback && (
                <p className="text-[10px] text-gold-300 leading-tight font-medium">
                  {searchFeedback}
                </p>
              )}

              {customerOrderCount !== null && (
                <p className="text-[10px] bg-white/10 border border-white/5 p-1 px-2 rounded font-medium text-gold-300">
                  Customer Stats: <span className="font-bold text-white font-mono">{customerOrderCount}</span> orders processed
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Name"
                  readOnly
                  value={customerName}
                  className="px-3 py-1.5 bg-white/10 border border-white/10 text-xs rounded text-white/50 cursor-not-allowed"
                />
                <input
                  type="email"
                  placeholder="Email"
                  readOnly
                  value={customerEmail}
                  className="px-3 py-1.5 bg-white/10 border border-white/10 text-xs rounded text-white/50 cursor-not-allowed"
                />
              </div>
            </div>
          ) : (
            /* Walk-in Customer Fields */
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-flora-cream/60 font-medium block">
                Walk-in Details
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Name (Required)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded focus:outline-none focus:ring-1 focus:ring-gold-500 placeholder-white/30"
                />
                <input
                  type="text"
                  required
                  placeholder="Phone (Required)"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded focus:outline-none focus:ring-1 focus:ring-gold-500 placeholder-white/30"
                />
              </div>

              {showEmailField ? (
                <div className="flex gap-2 items-center mt-2">
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded focus:outline-none focus:ring-1 focus:ring-gold-500 placeholder-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowEmailField(false); setCustomerEmail(''); }}
                    className="text-[10px] text-flora-cream/50 hover:text-flora-cream font-medium"
                  >
                    Hide
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowEmailField(true)}
                  className="text-[10px] text-gold-300 hover:text-gold-400 font-semibold block mt-1 hover:underline"
                >
                  + Add Email Address (Optional)
                </button>
              )}
            </div>
          )}

          {/* Fulfillment & Order Note */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-flora-cream/60 font-medium block mb-1">
                Fulfillment
              </label>
              <div className="px-3 py-1.5 bg-white/10 border border-white/10 text-xs rounded font-medium text-center cursor-default">
                Store Pickup
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-flora-cream/60 font-medium block mb-1">
                Payment Method
              </label>
              <div className="flex gap-1">
                {(['Cash', 'Card', 'QR'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-1 border text-[10px] rounded transition-all font-semibold uppercase tracking-wider
                      ${paymentMethod === method
                        ? 'bg-gold-500 border-gold-500 text-white'
                        : 'border-white/10 hover:bg-white/5 text-flora-cream/80'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <textarea
              placeholder="Add order note..."
              rows={2}
              value={orderNote}
              onChange={e => setOrderNote(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded focus:outline-none focus:ring-1 focus:ring-gold-500 placeholder-white/30 resize-none"
            />
          </div>

          {/* Grand Totals */}
          <div className="border-t border-white/10 pt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-flora-cream/60">
              <span>Subtotal</span>
              <span className="font-mono">LKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-flora-cream/60">
              <span>Delivery Charge</span>
              <span className="font-mono">LKR 0.00</span>
            </div>
            <div className="flex justify-between font-serif text-lg font-bold border-t border-white/10 pt-2 text-gold-400">
              <span>Total</span>
              <span className="font-mono">LKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Checkout Submit Button */}
          <button
            onClick={handleCompleteSale}
            disabled={completing || cart.length === 0}
            className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-gold-800 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded transition-colors uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
          >
            {completing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Complete Sale'
            )}
          </button>
        </div>
      </div>

      {/* Receipt Modal Overlay */}
      {showReceipt && createdOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div 
            id="receipt-modal-container"
            className="bg-white text-gray-800 p-6 rounded-lg max-w-sm w-full shadow-2xl relative flex flex-col max-h-[90vh] print:m-0 print:p-0 print:shadow-none"
          >
            {/* Inline Printer Override Styles */}
            <style>{`
              @media print {
                body {
                  background: white !important;
                  color: black !important;
                }
                nav, aside, header, main, button, footer {
                  display: none !important;
                }
                html, body {
                  height: auto !important;
                  overflow: visible !important;
                }
                #receipt-modal-container {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100% !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 !important;
                  padding: 15px !important;
                  display: block !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* Scrollable Area */}
            <div className="overflow-y-auto pr-1 flex-1">
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b border-dashed border-gray-300">
                <h1 className="font-serif text-2xl text-flora-brown font-bold tracking-wide">Chrish Flora</h1>
                <p className="text-[10px] text-gray-500 mt-0.5">Luxury Floral Boutique</p>
                <p className="text-[10px] text-gray-400">Colombo, Sri Lanka</p>
              </div>

              {/* Order Meta Info */}
              <div className="py-3 text-[11px] space-y-1 text-gray-600 border-b border-dashed border-gray-300">
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono font-semibold">{createdOrder.id.substring(0, 8).toUpperCase()}...</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span className="font-mono">{new Date(createdOrder.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier Name:</span>
                  <span className="font-medium">{cashier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fulfillment:</span>
                  <span className="font-semibold uppercase text-gold-600">Store Pickup</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-semibold">{createdOrder.payment_method}</span>
                </div>
                {customerName && (
                  <div className="border-t border-gray-100 pt-1.5 mt-1.5 text-[10px]">
                    <p className="font-semibold text-gray-700">Customer Details:</p>
                    <p>{customerName} | {customerPhone}</p>
                    <p className="text-gray-400">{customerEmail || 'Walk-in (No Email)'}</p>
                  </div>
                )}
              </div>

              {/* Itemized List */}
              <div className="py-3 border-b border-dashed border-gray-300 text-xs">
                <div className="grid grid-cols-12 font-semibold text-gray-600 mb-1.5 text-[10px] uppercase tracking-wider">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-4 text-right">Total</span>
                </div>
                <div className="space-y-2">
                  {createdOrder.items.map((item: CartItem) => (
                    <div key={item.product.id} className="grid grid-cols-12 text-[11px]">
                      <div className="col-span-6 pr-2">
                        <p className="font-medium text-gray-800 leading-tight">{item.product.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{item.product.sku}</p>
                      </div>
                      <span className="col-span-2 text-center font-mono">{item.quantity}</span>
                      <span className="col-span-4 text-right font-mono font-semibold">
                        LKR {(item.product.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="py-3 text-xs space-y-1.5 text-gray-700">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal</span>
                  <span className="font-mono">LKR {createdOrder.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Delivery Charge</span>
                  <span className="font-mono">LKR 0.00</span>
                </div>
                <div className="flex justify-between font-serif text-base font-bold text-flora-brown border-t border-dashed border-gray-300 pt-2">
                  <span>Grand Total</span>
                  <span className="font-mono">LKR {createdOrder.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Footer Thank You */}
              <div className="text-center pt-4 border-t border-dashed border-gray-300 space-y-1">
                <p className="font-serif text-sm italic text-flora-brown font-semibold">Thank you for shopping at Chrish Flora</p>
                <p className="text-[9px] text-gray-400">Please retain this receipt for returns or exchanges.</p>
              </div>
            </div>

            {/* Print & New Sale Buttons */}
            <div className="mt-6 space-y-2 no-print shrink-0">
              <button
                onClick={() => window.print()}
                className="w-full bg-flora-brown hover:bg-gold-950 text-white font-semibold py-2.5 rounded text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                Print Receipt
              </button>
              <button
                ref={newSaleBtnRef}
                onClick={handleNewSale}
                className="w-full bg-gold-500 hover:bg-gold-600 text-white font-semibold py-2.5 rounded text-xs transition-colors flex items-center justify-center gap-2 shadow"
              >
                <RefreshCw size={14} />
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
