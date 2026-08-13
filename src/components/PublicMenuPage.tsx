import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Category, PaymentMethod, DeliveryMethod, SelectedComboPiece, SelectedHalfAndHalf, SelectedExtra, OrderItem } from '../types';
import { safeNumber, formatCurrency, parseCashAmount } from '../utils/formatters';
import { 
  ShoppingBag, 
  ShoppingCart,
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  Check, 
  MapPin, 
  Phone, 
  User, 
  ChevronRight, 
  ArrowLeft,
  Flame, 
  Clock,
  DollarSign,
  FileText,
  Utensils,
  Fish,
  Beef,
  Coffee,
  Wine,
  IceCream,
  Tag,
  Star,
  Heart,
  Sparkles,
  AlertTriangle,
  ClipboardList,
  AlertCircle,
  Edit2,
  Info,
  Send,
  CreditCard,
  Coins,
  Landmark
} from 'lucide-react';
import { SushiRollIcon, SushiLogoEmblem } from './SushiIcons';
import ComboBuilderModal from './ComboBuilderModal';
import HalfAndHalfModal from './HalfAndHalfModal';
import { checkIsStoreOpen } from '../utils/storeStatus';

export default function PublicMenuPage() {
  const { 
    products, 
    categories, 
    visualConfig, 
    cart, 
    addToCart, 
    removeFromCart, 
 updateCartQuantity, 
    clearCart,
    appliedCoupon, 
    applyCouponCode, 
    removeCoupon, 
    createOrder,
    orders,
    setIsAdmin,
    setCurrentView
  } = useApp();

  const isPublicLink = new URLSearchParams(window.location.search).has('menu');

  // Store open/closed status state based on operating hours and config
  const [isStoreOpen, setIsStoreOpen] = useState(() => checkIsStoreOpen(visualConfig));

  useEffect(() => {
    setIsStoreOpen(checkIsStoreOpen(visualConfig));
  }, [visualConfig]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const isKomyCategoryStyle = visualConfig.categoryStyle === 'komy';

  // Start the menu on the first configured category instead of "Todos os Pratos".
  // Categories may still be loading (async fetch for public menu links), so wait
  // until they're available and only do this once.
  const hasSetInitialCategory = useRef(false);
  useEffect(() => {
    if (!hasSetInitialCategory.current && categories.length > 0) {
      setActiveCategory(categories[0].id);
      hasSetInitialCategory.current = true;
    }
  }, [categories]);


  // Cart & Checkout flow state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Modals
  const [comboModalProduct, setComboModalProduct] = useState<Product | null>(null);
  const [halfAndHalfModalProduct, setHalfAndHalfModalProduct] = useState<Product | null>(null);

  // Checkout Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsChange, setNeedsChange] = useState<boolean | null>(null);
  const [changeAmount, setChangeAmount] = useState<string>('');

  // Checkout wizard step (1: Dados & Entrega, 2: Pagamento, 3: Revisão)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);

  // Active placed order tracking
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  // Post-order screen: static receipt first, live tracking timeline only if the customer asks for it
  const [orderPhase, setOrderPhase] = useState<'receipt' | 'tracking'>('receipt');

  // Selected Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productNotes, setProductNotes] = useState('');
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);

  // Sync placed order status
  useEffect(() => {
    if (placedOrder) {
      const activeO = orders.find(o => o.id === placedOrder.id);
      if (activeO && activeO.status !== placedOrder.status) {
        setPlacedOrder(activeO);
      }
    }
  }, [orders, placedOrder]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput) return;
    const result = applyCouponCode(couponInput);
    setCouponMessage({ text: result.message, success: result.success });
  };

  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Step 1 validation: contact info + delivery address (when applicable)
  const validateCheckoutStep1 = (): boolean => {
    setCheckoutError(null);
    if (!name || !phone || (deliveryMethod === 'delivery' && !address)) {
      setCheckoutError("Por favor, preencha todos os campos obrigatórios (Nome, Telefone e Endereço).");
      return false;
    }
    return true;
  };

  // Step 2 validation: payment method + cash change details
  const validateCheckoutStep2 = (): boolean => {
    setCheckoutError(null);
    if (paymentMethod === 'cash') {
      if (needsChange === null) {
        setCheckoutError("Por favor, informe se vai precisar de troco para o pagamento em dinheiro.");
        return false;
      }
      if (needsChange === true) {
        if (!changeAmount.trim()) {
          setCheckoutError("Por favor, informe para quanto dinheiro precisará de troco.");
          return false;
        }
        const parsedCash = parseCashAmount(changeAmount);
        if (isNaN(parsedCash) || parsedCash <= 0) {
          setCheckoutError("Por favor, informe um valor de dinheiro válido para o troco.");
          return false;
        }
        if (parsedCash < finalTotal) {
          const formattedInput = parsedCash.toFixed(2).replace('.', ',');
          const formattedTotal = finalTotal.toFixed(2).replace('.', ',');
          setCheckoutError(`O valor informado (R$ ${formattedInput}) não pode ser menor do que o total do pedido (R$ ${formattedTotal}). Informe uma nota de valor maior.`);
          return false;
        }
      }
    }
    return true;
  };

  const goToCheckoutStep2 = () => {
    if (validateCheckoutStep1()) setCheckoutStep(2);
  };

  const goToCheckoutStep3 = () => {
    if (validateCheckoutStep2()) setCheckoutStep(3);
  };

  const handleCheckoutHeaderBack = () => {
    if (checkoutStep > 1) {
      setCheckoutError(null);
      setCheckoutStep((s) => (s - 1) as 1 | 2 | 3);
      return;
    }
    setIsCheckoutOpen(false);
    setIsCartOpen(true);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    if (!isStoreOpen) {
      setCheckoutError("O restaurante está fechado no momento. Não é possível receber novos pedidos.");
      return;
    }

    if (!validateCheckoutStep1()) {
      setCheckoutStep(1);
      return;
    }

    if (!validateCheckoutStep2()) {
      setCheckoutStep(2);
      return;
    }

    const newOrder = createOrder(
      { name, phone, email, address },
      deliveryMethod,
      paymentMethod,
      paymentMethod === 'cash' ? { needsChange: !!needsChange, changeAmount: needsChange ? changeAmount.trim() : '' } : undefined
    );

    setPlacedOrder(newOrder);
    setOrderPhase('receipt');
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setCheckoutStep(1);
  };

  const getOrderPaymentLabel = (order: any): string => {
    if (order.paymentMethod === 'pix') return 'Pix';
    if (order.paymentMethod === 'credit_card') return 'Cartão de Crédito';
    if (order.paymentMethod === 'debit_card') return 'Cartão de Débito';
    if (order.paymentMethod === 'cash') {
      if (order.needsChange) {
        const noteNum = parseCashAmount(order.changeAmount || '');
        const orderTotal = order.total || 0;
        const changeVal = noteNum > orderTotal ? noteNum - orderTotal : 0;
        const formattedNote = noteNum > 0 ? `R$ ${noteNum.toFixed(2).replace('.', ',')}` : order.changeAmount;
        const formattedChange = changeVal > 0 ? ` | Troco: R$ ${changeVal.toFixed(2).replace('.', ',')}` : '';
        return `Dinheiro (Troco para ${formattedNote}${formattedChange})`;
      }
      return 'Dinheiro (Sem troco)';
    }
    return 'Outros';
  };

  const sendOrderToWhatsApp = (order: any) => {
    const payStr = getOrderPaymentLabel(order);
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('pt-BR');
    const timeStr = orderDate.toLocaleTimeString('pt-BR');
    const storeName = (visualConfig.establishmentName || '').toUpperCase();

    const itemsText = (order.items as OrderItem[]).map((item) => {
      const removedText = item.removedIngredients && item.removedIngredients.length > 0 ? ` [Sem: ${item.removedIngredients.join(', ')}]` : '';
      const extrasText = item.extras && item.extras.length > 0 ? ` [+ ${item.extras.map(ex => `${ex.quantity}x ${ex.name}`).join(', ')}]` : '';
      const notesText = item.notes ? ` (Obs: ${item.notes})` : '';
      const unitPrice = safeNumber(item.product.promoPrice || item.product.price);
      const extrasTotal = (item.extras || []).reduce((s, ex) => s + safeNumber(ex.price) * safeNumber(ex.quantity), 0);
      const lineTotal = unitPrice * safeNumber(item.quantity, 1) + extrasTotal;
      return `*${item.quantity}x ${item.product.name}*${removedText}${extrasText}${notesText}\n`
        + `  └ Preço Unitário: R$ ${unitPrice.toFixed(2).replace('.', ',')}\n`
        + `  └ Total Item: R$ ${lineTotal.toFixed(2).replace('.', ',')}`;
    }).join('\n\n');

    const deliveryLine = order.deliveryMethod === 'delivery'
      ? `Entrega — ${order.customerAddress || 'Endereço não informado'}`
      : `Retirada no Local — ${visualConfig.address || 'Endereço não informado'}`;

    let messageText = `🚨 *NOVO PEDIDO NO ${storeName}*\n`;
    messageText += `============================\n`;
    messageText += `*DATA:* ${dateStr}, ${timeStr}\n`;
    messageText += `============================\n\n`;
    messageText += `👤 *CLIENTE:*\n`;
    messageText += `Nome: ${order.customerName}\n`;
    messageText += `WhatsApp: ${order.customerPhone}\n\n`;
    messageText += `🍱 *ITENS DO PEDIDO:*\n`;
    messageText += `${itemsText}\n\n`;
    messageText += `============================\n`;
    messageText += `💰 *EXTRATO FINANCEIRO:*\n`;
    messageText += `*TOTAL A PAGAR: R$ ${(order.total || 0).toFixed(2).replace('.', ',')}*\n`;
    messageText += `============================\n\n`;
    messageText += `🛵 *MEIO DE ENTREGA:*\n`;
    messageText += `${deliveryLine}\n`;
    messageText += `============================\n\n`;
    messageText += `💳 *PAGAMENTO:*\n`;
    messageText += `Forma: ${payStr}\n\n`;
    messageText += `============================\n\n`;
    messageText += `Obrigado pela preferência! Seu pedido começará a ser preparado em instantes. 🍣`;

    const txt = encodeURIComponent(messageText);
    window.open(`https://wa.me/55${visualConfig.phone.replace(/\D/g, '')}?text=${txt}`, '_blank');
  };

  const handleOpenProduct = (p: Product) => {
    if (p.isComboBuilder) {
      setComboModalProduct(p);
      return;
    }
    if (p.supportsHalfAndHalf) {
      setHalfAndHalfModalProduct(p);
      return;
    }

    const existingInCart = cart.find(c => c.product.id === p.id);
    setSelectedProduct(p);
    setProductQuantity(existingInCart ? existingInCart.quantity : 1);
    setProductNotes(existingInCart?.notes || '');
    setRemovedIngredients(existingInCart?.removedIngredients || []);
    setSelectedExtras(existingInCart?.extras || []);
  };

  const toggleRemoveIngredient = (ing: string) => {
    setRemovedIngredients(prev =>
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
    );
  };

  const setExtraQuantity = (extra: NonNullable<Product['extras']>[number], quantity: number) => {
    const clamped = Math.max(0, Math.min(extra.maxQuantity, quantity));
    setSelectedExtras(prev => {
      const withoutThis = prev.filter(e => e.id !== extra.id);
      if (clamped === 0) return withoutThis;
      return [...withoutThis, { id: extra.id, name: extra.name, price: extra.price, quantity: clamped }];
    });
  };

  const extrasTotalForSelection = (extras: SelectedExtra[]) =>
    extras.reduce((sum, ex) => sum + ex.price * ex.quantity, 0);

  const handleAddToCartModal = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, productQuantity, productNotes, removedIngredients, selectedExtras);
      setSelectedProduct(null);
      setRemovedIngredients([]);
      setSelectedExtras([]);
      setIsCartOpen(true);
    }
  };

  const handleAddComboToCart = (product: Product, comboFlavors: SelectedComboPiece[], notes: string) => {
    const summaryNotes = `[Combo Customizado]: ${comboFlavors.map(f => `${f.pieces}x ${f.flavorName}`).join(', ')}${notes ? ` | Observação: ${notes}` : ''}`;
    addToCart(product, 1, summaryNotes);
    setIsCartOpen(true);
  };

  const handleAddHalfAndHalfToCart = (product: Product, halfAndHalf: SelectedHalfAndHalf, notes: string) => {
    const summaryNotes = `[Meio a Meio 50/50]: 50% ${halfAndHalf.flavor1} + 50% ${halfAndHalf.flavor2}${notes ? ` | Obs: ${notes}` : ''}`;
    addToCart(product, 1, summaryNotes);
    setIsCartOpen(true);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => {
    const price = safeNumber(item.product.promoPrice || item.product.price);
    const extrasTotal = (item.extras || []).reduce((s, ex) => s + safeNumber(ex.price) * safeNumber(ex.quantity), 0);
    return acc + (price * safeNumber(item.quantity, 1)) + extrasTotal;
  }, 0);

  const deliveryFee = deliveryMethod === 'delivery' ? safeNumber(visualConfig.deliveryFee) : 0;
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (subtotal * safeNumber(appliedCoupon.value)) / 100;
    } else if (appliedCoupon.discountType === 'fixed') {
      discountAmount = safeNumber(appliedCoupon.value);
    } else if (appliedCoupon.discountType === 'free_delivery') {
      discountAmount = deliveryFee;
    }
  }

  const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);
  const totalCartCount = cart.reduce((a, b) => a + b.quantity, 0);

  const filteredProducts = products.filter(p => {
    const matchQ = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchC = activeCategory === 'all' || p.categoryIds.includes(activeCategory);
    return matchQ && matchC && p.isAvailable;
  });

  const renderCategoryIcon = (cat: Category | { name: string; icon?: string }) => {
    const iconKey = (cat.icon || '').toLowerCase();
    switch (iconKey) {
      case 'flame': return <Flame className="w-3.5 h-3.5 text-[#FF6A00]" />;
      case 'fish': return <Fish className="w-3.5 h-3.5 text-cyan-400" />;
      case 'beef': return <Beef className="w-3.5 h-3.5 text-red-400" />;
      case 'coffee': return <Coffee className="w-3.5 h-3.5 text-amber-600" />;
      case 'wine': return <Wine className="w-3.5 h-3.5 text-purple-400" />;
      case 'icecream':
      case 'ice-cream': return <IceCream className="w-3.5 h-3.5 text-pink-400" />;
      case 'tag': return <Tag className="w-3.5 h-3.5 text-emerald-400" />;
      case 'star': return <Star className="w-3.5 h-3.5 text-yellow-400" />;
      case 'heart': return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case 'sparkles': return <Sparkles className="w-3.5 h-3.5 text-[#FB923C]" />;
      case 'utensils': return <Utensils className="w-3.5 h-3.5 text-amber-400" />;
    }

    // A real emoji picked from the category icon picker (not one of the
    // legacy Lucide icon names above) — just render it as text.
    if (cat.icon) {
      return <span className="text-sm leading-none">{cat.icon}</span>;
    }

    const lower = cat.name.toLowerCase();
    if (lower.includes('hot') || lower.includes('entrada') || lower.includes('quente')) {
      return <Flame className="w-3.5 h-3.5 text-[#FF6A00]" />;
    }
    if (lower.includes('sushi') || lower.includes('sashimi') || lower.includes('temaki') || lower.includes('peixe')) {
      return <Fish className="w-3.5 h-3.5 text-cyan-400" />;
    }
    if (lower.includes('combo') || lower.includes('barca') || lower.includes('especia')) {
      return <Utensils className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-[#FB923C]" />;
  };

  // Smart Navigation Handler for "Voltar" (Back) in Cardápio Digital
  const handleHeaderBack = () => {
    if (isCheckoutOpen) {
      setIsCheckoutOpen(false);
      setIsCartOpen(true);
      return;
    }
    if (isCartOpen) {
      setIsCartOpen(false);
      return;
    }
    if (selectedProduct) {
      setSelectedProduct(null);
      return;
    }
    if (comboModalProduct) {
      setComboModalProduct(null);
      return;
    }
    if (halfAndHalfModalProduct) {
      setHalfAndHalfModalProduct(null);
      return;
    }
    if (placedOrder) {
      setPlacedOrder(null);
      return;
    }
    if (activeCategory !== 'all') {
      setActiveCategory('all');
      return;
    }
    // At initial main page of cardápio: return to dashboard!
    setIsAdmin(true);
    setCurrentView('dashboard');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen font-sans bg-[#0A0A0A] text-white selection:bg-[#FF6A00] selection:text-white" id="sushi-public-menu">
      
      {/* ==================== 1. STICKY TOP NAVBAR ==================== */}
      <header className="py-2.5 px-3.5 sm:py-3 sm:px-8 border-b border-[#22201D] flex items-center justify-between shrink-0 sticky top-0 z-30 bg-[#0F0D0B]/95 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <SushiLogoEmblem size={26} />
          <span className="font-display font-black text-xs sm:text-base tracking-tight text-white uppercase truncate">
            {visualConfig.establishmentName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Orange Cart Pill Button - smaller on mobile */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-[#FF5200] hover:bg-[#E04800] text-white font-extrabold text-[11px] sm:text-sm flex items-center gap-1.5 sm:gap-2.5 shadow-lg cursor-pointer transition-transform active:scale-95"
            title="Ver Carrinho"
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white" />
            <span className="font-mono font-black text-white">
              R$ {formatCurrency(subtotal).replace('.', ',')}
            </span>
          </button>
        </div>
      </header>

      {/* Main body depending on state */}
      {placedOrder ? (
        orderPhase === 'receipt' ? (
          /* ==================== TELA 4: SUCESSO (RECIBO) ==================== */
          <div className="flex-1 max-w-lg mx-auto w-full p-6 flex flex-col justify-center">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black text-white">Pedido feito com Sucesso!</h3>
              <p className="text-xs mt-1.5 text-[#93A5C4] max-w-xs mx-auto">
                Seu pedido será enviado via WhatsApp para a loja confirmar e iniciar o preparo.
              </p>
            </div>

            <div className="rounded-2xl border border-[#262626] bg-[#141414] p-5 font-mono text-white shadow-2xl">
              <div className="text-center">
                <p className="font-black uppercase tracking-wide text-sm">{visualConfig.establishmentName}</p>
                <p className="text-[#9CA3AF] text-[10px] mt-1">
                  {new Date(placedOrder.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="border-t border-dashed border-[#333] my-3" />

              <div className="space-y-1.5">
                {(placedOrder.items as OrderItem[]).map((item, idx) => {
                  const price = safeNumber(item.product.promoPrice || item.product.price);
                  const extrasTotal = (item.extras || []).reduce((s, ex) => s + safeNumber(ex.price) * safeNumber(ex.quantity), 0);
                  const lineTotal = price * safeNumber(item.quantity, 1) + extrasTotal;
                  return (
                    <div key={idx} className="flex justify-between gap-3 text-[11px]">
                      <span className="text-[#D1D5DB]">{item.quantity}x {item.product.name}</span>
                      <span className="text-white font-bold shrink-0">R$ {formatCurrency(lineTotal).replace('.', ',')}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-[#333] my-3" />

              <div className="space-y-1 text-[11px] text-[#9CA3AF]">
                <div className="flex justify-between gap-3">
                  <span>Cliente</span>
                  <span className="text-white text-right">{placedOrder.customerName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Telefone</span>
                  <span className="text-white text-right">{placedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>{placedOrder.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                  <span className="text-white text-right">
                    {placedOrder.deliveryMethod === 'delivery' ? (placedOrder.customerAddress || 'Não informado') : 'Retirada no Local'}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-[#333] my-3" />

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Subtotal</span>
                  <span>R$ {formatCurrency(Math.max(0, (placedOrder.total || 0) - (placedOrder.deliveryFee || 0) + (placedOrder.discountAmount || 0))).replace('.', ',')}</span>
                </div>
                {placedOrder.deliveryMethod === 'delivery' && (placedOrder.deliveryFee || 0) > 0 && (
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Taxa de Entrega</span>
                    <span>R$ {formatCurrency(placedOrder.deliveryFee).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-black text-sm pt-1.5">
                  <span className="text-white">TOTAL LÍQUIDO</span>
                  <span className="text-[#FF6A00]">R$ {formatCurrency(placedOrder.total || 0).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-[#9CA3AF] pt-1">
                  <span>Pago via</span>
                  <span className="text-white text-right">{getOrderPaymentLabel(placedOrder)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => sendOrderToWhatsApp(placedOrder)}
              className="w-full mt-4 bg-[#22C55E] hover:bg-[#16a34a] text-white py-3 rounded-full text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Pedido para WhatsApp</span>
            </button>

            <button
              onClick={() => setOrderPhase('tracking')}
              className="w-full mt-2.5 text-center text-[11px] font-bold text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
            >
              Acompanhar Status do Pedido →
            </button>

            <button
              onClick={() => setPlacedOrder(null)}
              className="w-full mt-1 flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Cardápio Inicial</span>
            </button>

            <div className="mt-4 p-3 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-[#FF6A00]" />
              <span className="text-xs font-black text-[#FF6A00]">
                Tempo de Entrega Estimado: {visualConfig.deliveryTime || '30-45 min'}
              </span>
            </div>
          </div>
        ) : (
        /* ==================== ACTIVE ORDER TRACKING TIMELINE SCREEN ==================== */
        <div className="flex-1 max-w-lg mx-auto w-full p-6 flex flex-col justify-center">
          <div className="p-6 rounded-3xl border border-[#262626] bg-[#161616] text-center shadow-2xl">
            <button
              onClick={() => setOrderPhase('receipt')}
              className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Recibo</span>
            </button>

            <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center mx-auto mb-4 animate-bounce border border-[#22C55E]/40">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <h3 className="text-xl font-display font-extrabold tracking-tight text-white">Pedido Confirmado no Sushiman!</h3>
            <p className="text-xs mt-1 font-mono text-[#9CA3AF]">
              Código do Pedido: <span className="font-bold text-white">{placedOrder.id}</span>
            </p>

            {/* Live Timeline */}
            <div className="my-8 space-y-6 text-left max-w-xs mx-auto">
              <div className="flex gap-4 items-start relative">
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-[#262626]"></div>
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center z-10 font-bold text-xs ${
                  placedOrder.status === 'received' || placedOrder.status === 'preparing' || placedOrder.status === 'dispatched' || placedOrder.status === 'delivered'
                    ? 'bg-[#FF6A00] text-white' : 'bg-[#262626] text-[#9CA3AF]'
                }`}>
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Pedido Recebido na Cozinha</h4>
                  <p className="text-[10px] mt-0.5 text-[#9CA3AF]">Conferindo os adicionais e corte dos peixes.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start relative">
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-[#262626]"></div>
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center z-10 font-bold text-xs ${
                  placedOrder.status === 'preparing' || placedOrder.status === 'dispatched' || placedOrder.status === 'delivered'
                    ? 'bg-[#FF6A00] text-white animate-pulse' : 'bg-[#262626] text-[#9CA3AF]'
                }`}>
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Sushiman em Ação</h4>
                  <p className="text-[10px] mt-0.5 text-[#9CA3AF]">Montando combinados e maçaricando hots.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start relative">
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-[#262626]"></div>
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center z-10 font-bold text-xs ${
                  placedOrder.status === 'dispatched' || placedOrder.status === 'delivered'
                    ? 'bg-[#FF6A00] text-white' : 'bg-[#262626] text-[#9CA3AF]'
                }`}>
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Saiu para Entrega</h4>
                  <p className="text-[10px] mt-0.5 text-[#9CA3AF]">Em bag térmica selada até seu endereço.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center z-10 font-bold text-xs ${
                  placedOrder.status === 'delivered'
                    ? 'bg-[#22C55E] text-white' : 'bg-[#262626] text-[#9CA3AF]'
                }`}>
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Pedido Entregue</h4>
                  <p className="text-[10px] mt-0.5 text-[#9CA3AF]">Itadakimasu! Bom apetite.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => sendOrderToWhatsApp(placedOrder)}
                className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Confirmação no WhatsApp</span>
              </button>

              <button
                onClick={() => setPlacedOrder(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer bg-[#1F1F1F] border border-[#262626] hover:bg-[#262626] text-white transition-colors"
              >
                Voltar para o Cardápio
              </button>
            </div>
          </div>
        </div>
        )
      ) : (
        /* ==================== CARDÁPIO CATALOG PUBLIC HOME ==================== */
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6 pb-28">
          
          {/* ==================== 2. HERO BANNER HEADER ==================== */}
          <div className="relative rounded-3xl overflow-hidden border border-[#262626] bg-[#0A0A0A] shadow-2xl min-h-[220px] sm:min-h-[250px] flex flex-col justify-between p-5 sm:p-7">
            <div className="absolute inset-0 z-0">
              <img 
                src={visualConfig.bannerUrl} 
                alt={visualConfig.establishmentName} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#0A0A0A]/85 backdrop-blur-[1px]"></div>
            </div>

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`text-[10px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1 cursor-default transition-all shadow-md ${
                    isStoreOpen
                      ? 'bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#22C55E]'
                      : 'bg-[#EF4444]/20 border-2 border-[#EF4444]/60 text-[#EF4444]'
                  }`}
                >
                  {isStoreOpen ? (
                    <span className="font-bold tracking-tight">
                      ABERTO {visualConfig.openingTime && visualConfig.closingTime ? `• ${visualConfig.openingTime} às ${visualConfig.closingTime}` : 'AGORA'}
                    </span>
                  ) : (
                    <span className="font-extrabold uppercase text-red-500 tracking-tight">
                      FECHADO {visualConfig.openingTime ? `(Abre às ${visualConfig.openingTime})` : 'NO MOMENTO'}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-[#161616]/90 backdrop-blur-md border border-[#262626] p-3 rounded-2xl flex flex-col gap-1.5 text-xs text-[#9CA3AF] shrink-0 shadow-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span className="font-bold text-white font-mono text-[11px]">
                    {visualConfig.deliveryTime || '30-45 min'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="font-bold text-[#22C55E] text-[11px]">
                    {deliveryFee === 0 ? 'Entrega Grátis' : `R$ ${formatCurrency(deliveryFee)}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 sm:mt-8">
              <div className="flex items-center gap-3">
                <img 
                  src={visualConfig.logoUrl} 
                  alt="Logo" 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-[#262626] object-cover shadow-xl bg-[#161616] shrink-0"
                />
                <div>
                  <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-white uppercase drop-shadow-md">
                    {visualConfig.establishmentName}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9CA3AF] font-medium mt-1 max-w-xl line-clamp-2">
                    Especialistas em culinária japonesa, temakis crocantes e combinados artesanais.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== 3. CATEGORIES NAVIGATION & SEARCH ==================== */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">

            <div className={`flex-1 overflow-x-auto scrollbar-none ${
              isKomyCategoryStyle ? 'bg-black rounded-full p-1.5' : 'pb-2'
            }`}>
              <div className="flex gap-2.5 w-fit min-w-full sm:min-w-0">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={
                    isKomyCategoryStyle
                      ? `px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                          activeCategory === 'all'
                            ? 'bg-[#FF6A00] text-black shadow-md'
                            : 'bg-transparent text-[#9CA3AF] hover:text-white'
                        }`
                      : `px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                          activeCategory === 'all'
                            ? 'bg-[#FF6A00] text-white shadow-md'
                            : 'bg-[#161616] border border-[#262626] hover:bg-[#1F1F1F] text-[#9CA3AF] hover:text-white'
                        }`
                  }
                >
                  Todos os Pratos
                </button>

                {categories.map(cat => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={
                        isKomyCategoryStyle
                          ? `px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                              isActive
                                ? 'bg-[#FF6A00] text-black font-black shadow-md'
                                : 'bg-transparent text-[#9CA3AF] hover:text-white'
                            }`
                          : `px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                              isActive
                                ? 'bg-[#FF6A00] text-white font-black shadow-md'
                                : 'bg-[#161616] border border-[#262626] hover:bg-[#1F1F1F] text-[#9CA3AF] hover:text-white'
                            }`
                      }
                    >
                      {renderCategoryIcon(cat)}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Pesquisar sushis, temakis, hots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-[#161616] text-white border border-[#262626] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>
          </div>

          {/* ==================== 4. PRODUCT CARDS GRID ==================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 pt-2">
            {filteredProducts.map(p => {
              const isTopSeller = p.tags?.includes('Destaque') || p.salesSuccessRate === 'high' || p.isComboBuilder;

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenProduct(p)}
                  className="bg-[#161616] border border-[#262626] rounded-2xl overflow-hidden hover:border-[#FF6A00]/60 transition-all flex flex-col justify-between group shadow-lg cursor-pointer"
                >
                  <div className="relative h-48 w-full bg-[#0A0A0A] overflow-hidden">
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Specialized Badge */}
                    {p.isComboBuilder ? (
                      <span className="bg-[#FF6A00] text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider absolute top-3 left-3 z-10 shadow-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-white" />
                        MONTADOR INTELIGENTE
                      </span>
                    ) : p.supportsHalfAndHalf ? (
                      <span className="bg-[#22C55E] text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider absolute top-3 left-3 z-10 shadow-md flex items-center gap-1">
                        SISTEMA MEIO A MEIO ☯
                      </span>
                    ) : isTopSeller ? (
                      <span className="bg-[#FF6A00] text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider absolute top-3 left-3 z-10 shadow-md flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-white" />
                        CAMPEÃO DE VENDAS
                      </span>
                    ) : null}
                  </div>

                  <div className="p-4.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-white group-hover:text-[#FF6A00] transition-colors leading-snug">
                        {p.name}
                      </h4>
                      <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-1.5 leading-relaxed font-normal">
                        {p.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#262626]/60 flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        {p.promoPrice && safeNumber(p.promoPrice) > 0 ? (
                          <>
                            <span className="text-lg font-black font-mono text-[#FF6A00]">R$ {formatCurrency(p.promoPrice)}</span>
                            <span className="text-xs font-mono line-through text-[#6B7280]">R$ {formatCurrency(p.price)}</span>
                          </>
                        ) : (
                          <span className="text-lg font-black font-mono text-[#FF6A00]">R$ {formatCurrency(p.price)}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProduct(p);
                        }}
                        className="bg-[#FF6A00] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:opacity-90"
                      >
                        <span>{p.isComboBuilder ? 'Montar Combo' : p.supportsHalfAndHalf ? 'Escolher Sabores' : 'Adicionar'}</span>
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== 5. PRODUCT DETAIL MODAL ==================== */}
      {selectedProduct && (() => {
        // No ingredients typed in for this product = nothing to offer removing
        // — no longer guessed from the description text.
        const availableIngredients = selectedProduct.ingredients || [];
        // A product can be in multiple categories — prefer whichever
        // category tab the customer is currently browsing, falling back to
        // the product's first category.
        const displayCategoryId = selectedProduct.categoryIds.includes(activeCategory)
          ? activeCategory
          : selectedProduct.categoryIds[0];
        const displayCategoryName = categories.find(c => c.id === displayCategoryId)?.name;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-[#24201C] bg-[#0F0D0B] text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              
              {/* Top Banner Image with Gradient & Floating Badge & Title Overlay */}
              <div className="h-56 sm:h-64 relative bg-[#080706] shrink-0 overflow-hidden">
                <img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
                />
                
                {/* Dark Gradient Overlay over image */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0D0B] via-[#0F0D0B]/50 to-black/30" />

                {/* Floating Category/Highlight Badge & Back Button */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="px-3 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-lg backdrop-blur-xs transition-transform active:scale-95 border border-white/10"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Voltar ({displayCategoryName || 'Categoria'})</span>
                  </button>

                  <span className="bg-[#FF5200]/20 border border-[#FF5200]/50 text-[#FF5200] font-extrabold text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-md hidden sm:inline-block">
                    {selectedProduct.tags?.includes('Destaque') ? 'DESTAQUES' : (displayCategoryName || 'DESTAQUES')}
                  </span>
                </div>

                {/* Floating Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center absolute top-4 right-4 cursor-pointer shadow-lg z-10 transition-transform active:scale-90 border border-white/10"
                  title="Fechar"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Title & Description sitting over bottom of image gradient */}
                <div className="absolute bottom-3 left-4 right-4 z-10 space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-[#A09D96] leading-snug line-clamp-2 font-normal">
                    {selectedProduct.description}
                  </p>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-[#24201C]">
                
                {/* REMOVER INGREDIENTES Section */}
                {availableIngredients.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1.5">
                      <h4 className="font-extrabold text-xs tracking-wider text-white uppercase">REMOVER INGREDIENTES</h4>
                      <span className="text-[#8E8B85] text-xs font-normal">(opcional)</span>
                    </div>
                    <p className="text-[#A09D96] text-xs">
                      Selecione o que você gostaria de retirar do seu prato:
                    </p>
                    
                    <div className="flex flex-wrap gap-2 pt-1">
                      {availableIngredients.map((ing, idx) => {
                        const isRemoved = removedIngredients.includes(ing);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleRemoveIngredient(ing)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                              isRemoved
                                ? 'bg-red-950/40 border border-red-600/70 text-red-400'
                                : 'bg-[#181614] border border-[#2A2724] hover:border-[#3E3A35] text-white'
                            }`}
                          >
                            <span className={isRemoved ? 'line-through' : ''}>
                              {isRemoved ? `Remover ${ing}` : ing}
                            </span>
                            {isRemoved && <X className="w-3.5 h-3.5 text-red-400 stroke-[2.5]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ADICIONAIS Section — only for products with configured extras */}
                {selectedProduct.extras && selectedProduct.extras.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1.5">
                      <h4 className="font-extrabold text-xs tracking-wider text-white uppercase">ADICIONAIS</h4>
                      <span className="text-[#8E8B85] text-xs font-normal">(opcional)</span>
                    </div>
                    <p className="text-[#A09D96] text-xs">
                      Capriche no seu pedido com um extra:
                    </p>

                    <div className="space-y-2 pt-1">
                      {selectedProduct.extras.map(extra => {
                        const current = selectedExtras.find(e => e.id === extra.id)?.quantity || 0;
                        return (
                          <div
                            key={extra.id}
                            className="flex items-center justify-between gap-3 bg-[#181614] border border-[#2A2724] rounded-xl px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{extra.name}</p>
                              <p className="text-[10px] text-[#A09D96] font-mono">
                                + R$ {formatCurrency(extra.price).replace('.', ',')} · até {extra.maxQuantity}x
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 bg-[#0F0D0B] border border-[#2A2724] rounded-full px-2.5 py-1">
                              <button
                                type="button"
                                onClick={() => setExtraQuantity(extra, current - 1)}
                                disabled={current === 0}
                                className="text-[#8E8B85] hover:text-white transition-colors cursor-pointer p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono font-black text-white text-xs min-w-[14px] text-center">{current}</span>
                              <button
                                type="button"
                                onClick={() => setExtraQuantity(extra, current + 1)}
                                disabled={current >= extra.maxQuantity}
                                className="text-[#8E8B85] hover:text-white transition-colors cursor-pointer p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* OBSERVAÇÕES ESPECIAIS Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-white uppercase tracking-wider">
                    <ClipboardList className="w-4 h-4 text-[#FF5200]" />
                    <span>OBSERVAÇÕES ESPECIAIS</span>
                  </div>

                  <div className="bg-[#181614] border border-[#2A2724] rounded-2xl p-3.5 focus-within:border-[#FF5200] transition-colors">
                    <textarea
                      maxLength={140}
                      placeholder="Ex: Ponto da carne mal passado, extra molho verde, mandar sachê de geleia de pimenta..."
                      value={productNotes}
                      onChange={(e) => setProductNotes(e.target.value)}
                      className="w-full bg-transparent text-white text-xs placeholder-[#6B6863] focus:outline-none resize-none h-16 leading-relaxed"
                    />
                    <div className="text-[10px] font-mono text-[#6B6863] text-right mt-1">
                      {productNotes.length}/140 caracteres
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Action Bar */}
              <div className="p-4 bg-[#12100E] border-t border-[#22201D] flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[#8E8B85] text-xs font-medium block">Valor Unitário</span>
                    <span className="text-xl font-mono font-black text-white">
                      R$ {formatCurrency(selectedProduct.promoPrice || selectedProduct.price).replace('.', ',')}
                    </span>
                  </div>

                  <div className="bg-[#181614] border border-[#2A2724] rounded-full px-3 py-1.5 flex items-center gap-3.5 text-white text-sm font-bold">
                    <button
                      type="button"
                      onClick={() => setProductQuantity(q => Math.max(1, q - 1))}
                      className="text-[#8E8B85] hover:text-white transition-colors cursor-pointer p-0.5"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-black text-white text-sm min-w-[20px] text-center">
                      {productQuantity}x
                    </span>
                    <button
                      type="button"
                      onClick={() => setProductQuantity(q => q + 1)}
                      className="text-[#8E8B85] hover:text-white transition-colors cursor-pointer p-0.5"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCartModal}
                  className="w-full bg-[#FF5200] hover:bg-[#E04800] text-black font-extrabold text-sm py-3.5 px-5 rounded-2xl flex items-center justify-between cursor-pointer transition-transform active:scale-[0.99] shadow-lg shadow-orange-600/25"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-black/20 flex items-center justify-center">
                      <ShoppingBag className="w-3.5 h-3.5 text-black fill-black" />
                    </div>
                    <span className="text-black font-black">Adicionar ao Carrinho</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono font-black text-sm text-black">
                    <span className="opacity-40">|</span>
                    <span>
                      R$ {formatCurrency(safeNumber(selectedProduct.promoPrice || selectedProduct.price) * productQuantity + extrasTotalForSelection(selectedExtras)).replace('.', ',')}
                    </span>
                  </div>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ==================== 6. CART SLIDE OVER DRAWER WITH HASHI & EXTRAS ==================== */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-[#0A0A0A]/85 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-[#161616] border-l border-[#262626] text-white flex flex-col justify-between shadow-2xl relative">
            
            <div className="p-5 border-b border-[#262626] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-xl bg-[#262626] hover:bg-[#333] text-[#FF6A00] cursor-pointer transition-colors mr-1 flex items-center gap-1 text-xs font-bold"
                  title="Voltar ao Cardápio"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <ShoppingBag className="w-5 h-5 text-[#FF6A00]" />
                <h3 className="font-black text-base text-white">Seu Carrinho</h3>
                <span className="bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {totalCartCount} itens
                </span>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="p-1.5 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#262626] cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-[#9CA3AF]">
                  <SushiRollIcon size={48} className="text-[#262626] mx-auto mb-3" />
                  <p className="text-sm font-medium">Seu carrinho está vazio.</p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.product.id} className="p-3.5 bg-[#0F0E0C] border border-[#262626] rounded-2xl flex gap-3.5 items-center">
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          className="w-16 h-16 rounded-xl object-cover bg-[#161616] shrink-0 border border-[#262626]"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-snug">{item.product.name}</h4>
                            <span className="font-mono font-bold text-xs sm:text-sm text-white whitespace-nowrap">
                              R$ {formatCurrency(safeNumber(item.product.promoPrice || item.product.price) * item.quantity + extrasTotalForSelection(item.extras || [])).replace('.', ',')}
                            </span>
                          </div>

                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                              <span>Sem:</span>
                              <span className="line-through">{item.removedIngredients.join(', ')}</span>
                            </p>
                          )}
                          {item.extras && item.extras.length > 0 && (
                            <p className="text-[10px] text-[#22C55E] font-semibold mt-0.5">
                              + {item.extras.map(ex => `${ex.quantity}x ${ex.name}`).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-[#FF6A00] italic line-clamp-2 mt-0.5">{item.notes}</p>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setIsCartOpen(false);
                                  handleOpenProduct(item.product);
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-[#A09D96] hover:text-white bg-[#181614] border border-[#2A2724] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-[#A09D96]" />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-[#8E8B85] hover:text-red-400 cursor-pointer transition-colors p-1"
                                title="Remover item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="bg-[#181614] border border-[#2A2724] rounded-lg px-2.5 py-1 flex items-center gap-3 text-white font-bold text-xs">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                className="text-[#8E8B85] hover:text-white cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-xs text-white min-w-[14px] text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                className="text-[#8E8B85] hover:text-white cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Form */}
                  <form onSubmit={handleApplyCoupon} className="border-t border-[#262626] pt-4">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1.5 text-[#9CA3AF]">Cupom de Desconto</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: SUSHI10"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="flex-1 bg-[#0A0A0A] border border-[#262626] text-white px-3 py-1.5 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-[#FF6A00]"
                      />
                      <button
                        type="submit"
                        className="bg-[#FF6A00] text-white px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-[#E65F00] transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>

                    {couponMessage && (
                      <p className={`text-[10px] mt-1.5 font-semibold ${
                        couponMessage.success ? 'text-[#22C55E]' : 'text-[#DC2626]'
                      }`}>
                        {couponMessage.text}
                      </p>
                    )}

                    {appliedCoupon && (
                      <div className="mt-2.5 flex items-center justify-between bg-[#0A0A0A] text-[#FF6A00] border border-[#FF6A00]/40 px-3 py-1.5 rounded-xl text-[10px] font-semibold">
                        <span>Cupom Ativo: <span className="font-mono font-bold">{appliedCoupon.code}</span></span>
                        <button type="button" onClick={removeCoupon} className="underline hover:text-white">Remover</button>
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>

            {/* Cart Drawer Footer */}
            <div className="p-5 border-t border-[#262626] bg-[#0A0A0A] shrink-0 space-y-4">
              <div className="space-y-2 text-xs text-[#9CA3AF]">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-bold text-white font-mono text-sm">R$ {formatCurrency(subtotal).replace('.', ',')}</span>
                </div>
                {deliveryMethod === 'delivery' && (
                  <div className="flex justify-between items-center">
                    <span>Taxa de Entregador</span>
                    <span className="font-bold font-mono">
                      {deliveryFee === 0 ? (
                        <span className="text-[#22C55E] font-bold tracking-wide">GRÁTIS</span>
                      ) : (
                        `R$ ${formatCurrency(deliveryFee).replace('.', ',')}`
                      )}
                    </span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-[#22C55E]">
                    <span>Desconto</span>
                    <span className="font-bold font-mono">- R$ {formatCurrency(discountAmount).replace('.', ',')}</span>
                  </div>
                )}
                <div className="border-t border-[#262626] pt-2.5 flex justify-between items-center mt-2">
                  <span className="text-white font-extrabold text-sm sm:text-base">Total do Pedido</span>
                  <span className="font-mono text-lg sm:text-xl font-black text-[#FF6A00]">
                    R$ {formatCurrency(finalTotal).replace('.', ',')}
                  </span>
                </div>
              </div>

              {!isStoreOpen ? (
                <div className="space-y-2.5 pt-1">
                  <div className="bg-[#240B0E] border border-[#481419] text-[#FF5252] font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-center shadow-md">
                    <AlertCircle className="w-4.5 h-4.5 text-[#FF5252] shrink-0" />
                    <span className="tracking-wide uppercase font-black">RESTAURANTE FECHADO NO MOMENTO</span>
                  </div>

                  <button
                    disabled
                    className="w-full bg-[#1C1A18] text-[#6B6B6B] border border-[#2A2724] font-bold text-sm py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed shadow-inner"
                  >
                    <span>Fechado no Momento</span>
                    <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (cart.length === 0) return;
                    setCheckoutStep(1);
                    setCheckoutError(null);
                    setIsCheckoutOpen(true);
                  }}
                  disabled={cart.length === 0}
                  className="w-full bg-[#FF6A00] hover:bg-[#E65F00] text-white font-black text-sm py-4 px-5 rounded-2xl flex items-center justify-between shadow-lg shadow-orange-600/20 cursor-pointer transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Avançar para o Checkout</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 7. CHECKOUT WIZARD DIALOG (3 STEPS) ==================== */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-[#0A0A0A]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-[20px] border border-[#262626] bg-[#161616] text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 pb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckoutHeaderBack}
                  className="p-2 rounded-xl bg-[#141414] border border-[#262626] hover:bg-[#1f1f1f] text-white cursor-pointer transition-colors shrink-0"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#FF6A00]">Checkout</p>
                  <h3 className="font-display font-black text-lg text-white leading-tight">Finalizar Pedido</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setIsCartOpen(true);
                }}
                className="p-1.5 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#262626] cursor-pointer transition-colors shrink-0"
                title="Voltar ao Carrinho"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-start justify-center px-5 pb-4 shrink-0">
              {[
                { n: 1 as const, label: 'Dados & Entrega' },
                { n: 2 as const, label: 'Pagamento' },
                { n: 3 as const, label: 'Revisão' }
              ].map((s, idx, arr) => (
                <React.Fragment key={s.n}>
                  <div className="flex flex-col items-center gap-1.5 w-16">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                        checkoutStep >= s.n ? 'bg-[#FF6A00] text-white' : 'bg-[#262626] text-[#6B7280]'
                      }`}
                    >
                      {s.n}
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
                        checkoutStep >= s.n ? 'text-white' : 'text-[#6B7280]'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mt-4 rounded-full transition-colors ${
                        checkoutStep > s.n ? 'bg-[#FF6A00]' : 'bg-[#262626]'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <form onSubmit={handleCheckoutSubmit} className="flex-1 overflow-y-auto p-5 pt-4 border-t border-[#262626] space-y-4">
              {checkoutError && (
                <div className="bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* ---------- STEP 1: DADOS & ENTREGA ---------- */}
              {checkoutStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide text-white flex items-center gap-1.5">
                      <span className="text-[#FF6A00]">1.</span>
                      <span>Seus Dados de Contato</span>
                    </h4>
                    <div className="h-px bg-[#262626] mt-2 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 text-[#93A5C4]">Nome Completo*</label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 text-[#6B7280] absolute left-3.5 top-3" />
                          <input
                            type="text"
                            required
                            placeholder="Ex: João da Silva Santos"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-lg bg-[#141414] border border-[#262626] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00] transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 text-[#93A5C4]">Telefone/WhatsApp*</label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-[#6B7280] absolute left-3.5 top-3" />
                          <input
                            type="text"
                            required
                            placeholder="Ex: (11) 99999-8888"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-lg bg-[#141414] border border-[#262626] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00] transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1.5 text-[#93A5C4]">Meio de Entrega</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'delivery', label: 'Delivery', emoji: '🛵' },
                        { id: 'pickup', label: 'Retirar no Local', emoji: '🏬' }
                      ].map(m => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => setDeliveryMethod(m.id as DeliveryMethod)}
                          className={`py-2.5 text-xs rounded-lg border-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            deliveryMethod === m.id
                              ? 'border-[#FF6A00] bg-[#FF6A00]/10 text-[#FF6A00] font-black'
                              : 'border-[#262626] bg-[#141414] text-[#9CA3AF] font-bold hover:text-white'
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {deliveryMethod === 'delivery' ? (
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1.5 text-[#93A5C4]">Endereço de Entrega</label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-[#6B7280] absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Rua das Flores, 123, Bairro Centro"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-lg bg-[#141414] border border-[#262626] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#FF6A00] transition-colors"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-black text-sm">
                        <MapPin className="w-4 h-4 text-[#FF6A00] shrink-0" />
                        <span>Retirada no Local</span>
                      </div>
                      <p className="text-xs text-white/90 font-semibold pl-6">{visualConfig.address || 'Endereço da loja não configurado'}</p>
                      <p className="text-[11px] text-[#93A5C4] pl-6">Você será avisado por WhatsApp assim que o pedido estiver pronto para retirar.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ---------- STEP 2: PAGAMENTO ---------- */}
              {checkoutStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide text-white flex items-center gap-1.5">
                      <span className="text-[#FF6A00]">2.</span>
                      <span>Forma de Pagamento</span>
                    </h4>
                    <div className="h-px bg-[#262626] mt-2 mb-4" />
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'pix', label: 'Pix', icon: Landmark },
                        { id: 'credit_card', label: 'Cartão', icon: CreditCard },
                        { id: 'cash', label: 'Dinheiro', icon: Coins }
                      ].map(p => {
                        const IconComp = p.icon;
                        const isSelected = p.id === 'cash' ? paymentMethod === 'cash' : paymentMethod === p.id;
                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              setPaymentMethod(p.id as PaymentMethod);
                              if (p.id === 'cash') {
                                setNeedsChange(null);
                              }
                            }}
                            className={`py-3 rounded-lg border-2 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'border-[#FF6A00] bg-[#FF6A00]/10 text-[#FF6A00] font-black'
                                : 'border-[#262626] bg-[#141414] text-[#9CA3AF] font-bold hover:text-white'
                            }`}
                          >
                            <IconComp className="w-4.5 h-4.5" />
                            <span className="text-xs">{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {paymentMethod !== 'cash' && (
                    <div className="p-3.5 rounded-xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 flex gap-2.5">
                      {paymentMethod === 'pix' ? (
                        <>
                          <Info className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-white">Como pagar via Pix</p>
                            <p className="text-[11px] text-[#93A5C4] mt-0.5">
                              Ao confirmar, enviaremos um resumo do pedido por WhatsApp junto com a chave Pix para pagamento.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-white">Pagar na Entrega</p>
                            <p className="text-[11px] text-[#93A5C4] mt-0.5">
                              Levamos a maquininha física até você. Aceitamos as principais bandeiras de crédito e débito.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'cash' && (
                    <div className="p-3.5 rounded-xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 space-y-3 animate-in fade-in duration-200">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-[#93A5C4]">
                        Precisa de troco para o Entregador?*
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNeedsChange(true)}
                          className={`py-2 text-xs rounded-full border-2 transition-colors cursor-pointer ${
                            needsChange === true
                              ? 'border-[#FF6A00] bg-[#FF6A00]/20 text-[#FF6A00] font-black'
                              : 'border-[#262626] bg-[#141414] text-[#9CA3AF] font-bold hover:text-white'
                          }`}
                        >
                          Sim, Preciso
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNeedsChange(false);
                            setChangeAmount('');
                          }}
                          className={`py-2 text-xs rounded-full border-2 transition-colors cursor-pointer ${
                            needsChange === false
                              ? 'border-[#FF6A00] bg-[#FF6A00]/20 text-[#FF6A00] font-black'
                              : 'border-[#262626] bg-[#141414] text-[#9CA3AF] font-bold hover:text-white'
                          }`}
                        >
                          Não Preciso (Valor Exato)
                        </button>
                      </div>

                      {needsChange === true && (() => {
                        const parsedVal = parseCashAmount(changeAmount);
                        const hasEnteredValue = changeAmount.trim() !== '';
                        const isValidNumber = hasEnteredValue && !isNaN(parsedVal) && parsedVal > 0;
                        const isTooLow = isValidNumber && parsedVal < finalTotal;
                        const calculatedChange = isValidNumber && !isTooLow ? parsedVal - finalTotal : 0;
                        const suggestedPlaceholder = finalTotal > 0
                          ? (Math.ceil((finalTotal + 5) / 10) * 10).toFixed(2).replace('.', ',')
                          : '50,00';

                        return (
                          <div className="pt-1 space-y-2">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-[#93A5C4]">
                              Troco para quanto? (Valor da nota em dinheiro)*
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-3 text-xs font-bold text-[#FF6A00]">R$</span>
                              <input
                                type="text"
                                required
                                placeholder={`Ex: ${suggestedPlaceholder}`}
                                value={changeAmount}
                                onChange={(e) => setChangeAmount(e.target.value)}
                                className={`w-full pl-10 pr-3 py-2.5 text-xs font-mono rounded-lg bg-[#141414] border text-white placeholder-[#6B7280] focus:outline-none transition-colors ${
                                  isTooLow
                                    ? 'border-red-500/80 focus:border-red-500'
                                    : isValidNumber
                                    ? 'border-emerald-500/80 focus:border-emerald-500'
                                    : 'border-[#262626] focus:border-[#FF6A00]'
                                }`}
                              />
                            </div>

                            <div className="text-[11px] font-mono space-y-1 bg-[#0A0A0A] p-2.5 rounded-lg border border-[#222222]">
                              <div className="flex justify-between text-[#9CA3AF]">
                                <span>Total do pedido:</span>
                                <span className="font-bold text-white">R$ {formatCurrency(finalTotal).replace('.', ',')}</span>
                              </div>

                              {isTooLow && (
                                <div className="text-red-400 font-bold flex items-center gap-1 pt-0.5 border-t border-[#262626]">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>O valor deve ser de no mínimo R$ {formatCurrency(finalTotal).replace('.', ',')}</span>
                                </div>
                              )}

                              {isValidNumber && !isTooLow && (
                                <div className="text-emerald-400 font-bold flex items-center justify-between pt-0.5 border-t border-[#262626]">
                                  <span className="flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                    <span>Seu troco será:</span>
                                  </span>
                                  <span>R$ {formatCurrency(calculatedChange).replace('.', ',')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ---------- STEP 3: REVISÃO FINAL ---------- */}
              {checkoutStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h4 className="text-xs font-black uppercase tracking-wide text-white">Revisão do Pedido</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-[#262626] bg-[#141414]">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#93A5C4]">Informações do Cliente</p>
                      <p className="text-sm font-bold text-white">{name}</p>
                      <p className="text-xs font-mono text-[#9CA3AF]">{phone}</p>
                    </div>
                    <div className="space-y-1 sm:border-l sm:border-[#262626] sm:pl-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#93A5C4]">Meio de Entrega</p>
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        {deliveryMethod === 'delivery' ? (
                          <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                        ) : (
                          <ShoppingBag className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                        )}
                        <span>{deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada no Local'}</span>
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {deliveryMethod === 'delivery' ? (address || 'Endereço não informado') : (visualConfig.address || '-')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-1">
                    <div className="w-5 h-5 rounded-full bg-[#22C55E]/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#22C55E] stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-white">
                      Método de Pagamento: <span className="text-[#22C55E]">
                        {paymentMethod === 'pix' ? 'Pix' : paymentMethod === 'credit_card' ? 'Cartão' : paymentMethod === 'debit_card' ? 'Cartão' : needsChange ? `Dinheiro (Troco para ${changeAmount || '?'})` : 'Dinheiro (Valor Exato)'}
                      </span>
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#93A5C4] mb-1.5">Resumo dos Itens ({cart.length}x)</p>
                    <div className="space-y-1.5">
                      {cart.map((item, idx) => {
                        const price = safeNumber(item.product.promoPrice || item.product.price);
                        const extrasTotal = (item.extras || []).reduce((s, ex) => s + safeNumber(ex.price) * safeNumber(ex.quantity), 0);
                        const lineTotal = price * safeNumber(item.quantity, 1) + extrasTotal;
                        return (
                          <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#1f1f1f]">
                            <span className="text-xs text-white font-semibold">{item.quantity}x {item.product.name}</span>
                            <span className="text-xs font-mono font-bold text-white shrink-0">R$ {formatCurrency(lineTotal).replace('.', ',')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- FOOTER ---------- */}
              <div className="pt-4 border-t border-[#262626] flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#93A5C4]">Total a ser pago</p>
                  <p className="font-mono text-lg font-black text-[#FF6A00]">R$ {formatCurrency(finalTotal).replace('.', ',')}</p>
                </div>

                {checkoutStep === 1 && (
                  <button
                    type="button"
                    onClick={goToCheckoutStep2}
                    className="px-6 py-2.5 rounded-full text-xs font-black cursor-pointer bg-[#141414] border border-[#262626] hover:bg-[#1f1f1f] text-white transition-colors flex items-center gap-1.5"
                  >
                    <span>Prosseguir</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {checkoutStep === 2 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutError(null);
                        setCheckoutStep(1);
                      }}
                      className="px-4 py-2.5 rounded-full text-xs font-black cursor-pointer bg-[#141414] border border-[#262626] hover:bg-[#1f1f1f] text-white transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={goToCheckoutStep3}
                      className="px-6 py-2.5 rounded-full text-xs font-black cursor-pointer bg-[#262626] border border-[#3a3a3a] hover:bg-[#333] text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>Prosseguir</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {checkoutStep === 3 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutError(null);
                        setCheckoutStep(2);
                      }}
                      className="px-4 py-2.5 rounded-full text-xs font-black cursor-pointer bg-[#141414] border border-[#262626] hover:bg-[#1f1f1f] text-white transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-full text-xs font-black text-white cursor-pointer bg-[#FF6A00] hover:bg-[#E65F00] transition-transform active:scale-95 flex items-center gap-1.5 shadow-lg shadow-orange-600/20"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Confirmar Pedido</span>
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 8. MODALS FOR COMBO BUILDER & HALF AND HALF ==================== */}
      {comboModalProduct && (
        <ComboBuilderModal
          product={comboModalProduct}
          onClose={() => setComboModalProduct(null)}
          onAddToCart={handleAddComboToCart}
        />
      )}

      {halfAndHalfModalProduct && (
        <HalfAndHalfModal
          product={halfAndHalfModalProduct}
          onClose={() => setHalfAndHalfModalProduct(null)}
          onAddToCart={handleAddHalfAndHalfToCart}
        />
      )}

      {/* ==================== 9. FLOATING BOTTOM CART BAR (MOBILE ONLY) ==================== */}
      {cart.length > 0 && !isCartOpen && !isCheckoutOpen && !placedOrder && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-[#0F0D0B]/95 border-t border-[#22201D] backdrop-blur-md z-40 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#FF5200] hover:bg-[#E04800] text-white font-black text-xs sm:text-sm py-3 px-4 rounded-2xl flex items-center justify-between shadow-lg cursor-pointer transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center font-mono text-xs font-bold text-white">
                {totalCartCount}
              </div>
              <span className="font-extrabold text-white">Ver Carrinho</span>
            </div>
            <span className="font-mono font-black text-xs sm:text-sm text-white">
              R$ {formatCurrency(subtotal).replace('.', ',')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

