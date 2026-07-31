import React, { createContext, useContext, useState, useEffect } from 'react';
import { VisualConfig, Category, Product, Order, Coupon, CustomerInfo, SalesAnalytics, OrderItem, OrderStatus, PaymentMethod, DeliveryMethod } from '../types';
import {
  INITIAL_VISUAL_CONFIG,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_ANALYTICS,
  BLANK_VISUAL_CONFIG,
  BLANK_ANALYTICS
} from '../data/mockData';

interface AppContextType {
  visualConfig: VisualConfig;
  setVisualConfig: React.Dispatch<React.SetStateAction<VisualConfig>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  coupons: Coupon[];
  setCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
  customers: CustomerInfo[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerInfo[]>>;
  analytics: SalesAnalytics;
  setAnalytics: React.Dispatch<React.SetStateAction<SalesAnalytics>>;
  
  // Navigation & Session
  currentView: string;
  setCurrentView: (view: string) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  loggedIn: boolean;
  setLoggedIn: (loggedIn: boolean) => void;
  currentPlan: 'basic' | 'pro' | 'premium';
  setCurrentPlan: (plan: 'basic' | 'pro' | 'premium') => void;
  // Public (logged-out) marketing screens: landing, login, trial signup
  publicView: 'landing' | 'login' | 'trial';
  setPublicView: (view: 'landing' | 'login' | 'trial') => void;
  // Locally-stored trial account credentials (mock only — no real backend auth yet)
  registeredCredentials: { email: string; password: string } | null;
  // Registers the e-mail/senha and logs a brand-new trial account in with a blank workspace (no demo data)
  startBlankTrialAccount: (email: string, password: string) => void;
  // Validates e-mail/senha against the locally-stored trial account and logs in on match
  attemptLogin: (email: string, password: string) => { success: boolean; message: string };

  // Shopping Cart & Checkout
  cart: OrderItem[];
  addToCart: (product: Product, quantity?: number, notes?: string, removedIngredients?: string[]) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCouponCode: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  createOrder: (customer: { name: string; phone: string; address?: string; email?: string }, deliveryMethod: DeliveryMethod, paymentMethod: PaymentMethod, cashChangeInfo?: { needsChange?: boolean; changeAmount?: string }) => Order;

  // AI Actions
  generateAIDescription: (productName: string, category: string, ingredients: string[]) => Promise<{ description: string; copy: string; keywords: string[] }>;
  suggestAICombos: () => Promise<any>;
  analyzeAISales: () => Promise<any>;

  // Management functions
  addProduct: (product: Omit<Product, 'id' | 'salesCount'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addCoupon: (coupon: Coupon) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Restore states from localStorage or use initial mock data
  const [visualConfig, setVisualConfig] = useState<VisualConfig>(() => {
    const saved = localStorage.getItem('luvia_visual_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (!config.establishmentName || config.establishmentName.includes('Burger') || config.establishmentName.includes('Grill') || config.establishmentName === 'Luvia Gourmet') {
          config.establishmentName = 'Luvia Sushi & Temaki';
        }
        if (config.primaryColor === '#EC4899' || config.primaryColor === '#D85A30' || config.primaryColor === '#042C53' || config.primaryColor === '#2563EB') {
          config.primaryColor = '#F97316';
        }
        config.themeMode = 'dark';
        if (!config.menuSlug || config.menuSlug === 'luvia-burger') {
          config.menuSlug = 'luvia-sushi';
        }
        config.deliveryFee = typeof config.deliveryFee === 'number' && !isNaN(config.deliveryFee) ? config.deliveryFee : (parseFloat(config.deliveryFee as any) || 0);
        localStorage.setItem('luvia_visual_config', JSON.stringify(config));
        return config;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_VISUAL_CONFIG;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('luvia_categories');
    if (saved) {
      try {
        const parsed: Category[] = JSON.parse(saved);
        if (parsed.some(c => c.name.toLowerCase().includes('burguer') || c.name.toLowerCase().includes('artesanal'))) {
          localStorage.setItem('luvia_categories', JSON.stringify(INITIAL_CATEGORIES));
          return INITIAL_CATEGORIES;
        }
        return parsed;
      } catch (e) { console.error(e); }
    }
    return INITIAL_CATEGORIES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('luvia_products');
    if (saved) {
      try {
        const parsed: Product[] = JSON.parse(saved);
        if (parsed.some(p => p.name.toLowerCase().includes('burguer') || p.name.toLowerCase().includes('cheddar') || p.name.toLowerCase().includes('smash'))) {
          localStorage.setItem('luvia_products', JSON.stringify(INITIAL_PRODUCTS));
          return INITIAL_PRODUCTS;
        }
        return parsed.map(p => ({
          ...p,
          price: typeof p.price === 'number' && !isNaN(p.price) ? p.price : (parseFloat(p.price as any) || 0),
          promoPrice: p.promoPrice !== undefined && p.promoPrice !== null && !isNaN(parseFloat(p.promoPrice as any)) ? parseFloat(p.promoPrice as any) : undefined,
          ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
          tags: Array.isArray(p.tags) ? p.tags : []
        }));
      } catch (e) { console.error(e); }
    }
    return INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('luvia_orders');
    if (saved) {
      try {
        const parsed: Order[] = JSON.parse(saved);
        if (parsed.some(o => o.items?.some(i => i.product?.name?.toLowerCase().includes('burguer')))) {
          localStorage.setItem('luvia_orders', JSON.stringify(INITIAL_ORDERS));
          return INITIAL_ORDERS;
        }
        return parsed;
      } catch (e) { console.error(e); }
    }
    return INITIAL_ORDERS;
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('luvia_coupons');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });

  const [customers, setCustomers] = useState<CustomerInfo[]>(() => {
    const saved = localStorage.getItem('luvia_customers');
    if (saved) {
      try {
        const parsed: CustomerInfo[] = JSON.parse(saved);
        // Filter out test data entries
        const clean = parsed.filter(c => c.name && !/^[0-9a-zA-Z]{3,6}$/.test(c.name) && c.name.length > 2 && c.name !== "23413" && c.name !== "12312" && c.name !== "gdfg" && c.name !== "dfgd" && c.name !== "fafds");
        if (clean.length > 0) return clean;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CUSTOMERS;
  });

  const [analytics, setAnalytics] = useState<SalesAnalytics>(() => {
    const saved = localStorage.getItem('luvia_analytics');
    return saved ? JSON.parse(saved) : INITIAL_ANALYTICS;
  });

  // Flow control states
  const [currentView, setCurrentView] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('menu') ? 'public_menu' : 'home';
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return !urlParams.has('menu');
  }); 
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('menu');
  });
  const [currentPlan, setCurrentPlan] = useState<'basic' | 'pro' | 'premium'>('premium');
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'trial'>('landing');
  // TODO: mock-only credential storage (plaintext in localStorage). Replace with
  // real backend authentication (e.g. Supabase Auth) before going to production.
  const [registeredCredentials, setRegisteredCredentials] = useState<{ email: string; password: string } | null>(() => {
    const saved = localStorage.getItem('luvia_account_credentials');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  // Shopping Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const safeSetLocalStorage = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Failed to write ${key} to localStorage:`, err);
    }
  };

  // Sync state to localStorage on modification
  useEffect(() => {
    safeSetLocalStorage('luvia_visual_config', visualConfig);
    if (visualConfig.establishmentName) {
      document.title = `Cardapio Dígital - ${visualConfig.establishmentName}`;
    } else {
      document.title = 'Cardapio Dígital';
    }
  }, [visualConfig]);

  useEffect(() => {
    safeSetLocalStorage('luvia_categories', categories);
  }, [categories]);

  useEffect(() => {
    safeSetLocalStorage('luvia_products', products);
  }, [products]);

  useEffect(() => {
    safeSetLocalStorage('luvia_orders', orders);
  }, [orders]);

  useEffect(() => {
    safeSetLocalStorage('luvia_coupons', coupons);
  }, [coupons]);

  useEffect(() => {
    safeSetLocalStorage('luvia_customers', customers);
  }, [customers]);

  useEffect(() => {
    safeSetLocalStorage('luvia_analytics', analytics);
  }, [analytics]);

  useEffect(() => {
    if (registeredCredentials) {
      safeSetLocalStorage('luvia_account_credentials', registeredCredentials);
    }
  }, [registeredCredentials]);

  // Shopping Cart Handlers
  const addToCart = (product: Product, quantity = 1, notes = "", removedIngredients?: string[]) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        JSON.stringify(item.removedIngredients || []) === JSON.stringify(removedIngredients || []) &&
        (item.notes || "") === (notes || "")
      );
      if (existingIndex > -1) {
        return prev.map((item, idx) => 
          idx === existingIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, notes, removedIngredients }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCouponCode = (code: string) => {
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
    if (!coupon) {
      return { success: false, message: "Cupom inválido ou expirado." };
    }
    
    // Calculate current cart total
    const subtotal = cart.reduce((acc, item) => {
      const price = item.product.promoPrice || item.product.price;
      return acc + ((typeof price === 'number' && !isNaN(price) ? price : parseFloat(price as any) || 0) * item.quantity);
    }, 0);

    const minVal = typeof coupon.minOrderValue === 'number' && !isNaN(coupon.minOrderValue) ? coupon.minOrderValue : (parseFloat(coupon.minOrderValue as any) || 0);

    if (subtotal < minVal) {
      return { success: false, message: `O valor mínimo para este cupom é R$ ${minVal.toFixed(2)}.` };
    }

    setAppliedCoupon(coupon);
    return { success: true, message: "Cupom aplicado com sucesso!" };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Create real orders & update metrics dynamically!
  const createOrder = (
    customer: { name: string; phone: string; address?: string; email?: string },
    deliveryMethod: DeliveryMethod,
    paymentMethod: PaymentMethod,
    cashChangeInfo?: { needsChange?: boolean; changeAmount?: string }
  ): Order => {
    const subtotal = cart.reduce((acc, item) => {
      const price = item.product.promoPrice || item.product.price;
      return acc + (price * item.quantity);
    }, 0);

    const deliveryFee = deliveryMethod === 'delivery' ? visualConfig.deliveryFee : 0;
    
    let discountAmount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        discountAmount = (subtotal * appliedCoupon.value) / 100;
      } else if (appliedCoupon.discountType === 'fixed') {
        discountAmount = appliedCoupon.value;
      } else if (appliedCoupon.discountType === 'free_delivery') {
        discountAmount = deliveryFee;
      }
    }

    const total = Math.max(0, subtotal + deliveryFee - discountAmount);
    const orderId = `LUV-${Math.floor(1000 + Math.random() * 9000)}`;
    const pointsEarned = Math.floor(total / 10); // 1 point for every R$10 spent

    const newOrder: Order = {
      id: orderId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: customer.address,
      items: [...cart],
      status: 'received',
      paymentMethod,
      deliveryMethod,
      deliveryFee,
      discountAmount,
      total,
      createdAt: new Date().toISOString(),
      pointsEarned,
      couponCode: appliedCoupon?.code,
      needsChange: cashChangeInfo?.needsChange,
      changeAmount: cashChangeInfo?.changeAmount
    };

    // Update products sales counts
    setProducts(prev => {
      return prev.map(p => {
        const item = cart.find(cartItem => cartItem.product.id === p.id);
        if (item) {
          return { ...p, salesCount: p.salesCount + item.quantity };
        }
        return p;
      });
    });

    // Update orders list
    setOrders(prev => [newOrder, ...prev]);

    // Update customer lists and loyalty points
    setCustomers(prev => {
      const existing = prev.find(c => c.phone === customer.phone);
      if (existing) {
        return prev.map(c => 
          c.phone === customer.phone
            ? { 
                ...c, 
                loyaltyPoints: c.loyaltyPoints + pointsEarned,
                orderCount: c.orderCount + 1,
                lastOrderDate: new Date().toISOString().split('T')[0]
              }
            : c
        );
      } else {
        const newCust: CustomerInfo = {
          id: `cust-${Math.floor(100 + Math.random() * 900)}`,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || `${customer.name.toLowerCase().replace(/\s+/g, '')}@exemplo.com`,
          address: customer.address || "",
          loyaltyPoints: pointsEarned,
          orderCount: 1,
          lastOrderDate: new Date().toISOString().split('T')[0]
        };
        return [...prev, newCust];
      }
    });

    // Dynamically update Sales Analytics!
    setAnalytics(prev => {
      const daily = prev.dailyRevenue + total;
      const totalOrd = prev.totalOrders + 1;
      const ticketAvg = (prev.dailyRevenue + prev.weeklyRevenue + daily) / (totalOrd + 5); // Simulated average

      // Add to charts
      const lastHist = prev.revenueHistory[prev.revenueHistory.length - 1];
      const updatedRevenueHistory = prev.revenueHistory.map((h, i) => {
        if (i === prev.revenueHistory.length - 1) {
          return { ...h, amount: Math.round(h.amount + total) };
        }
        return h;
      });

      const updatedOrdersHistory = prev.ordersHistory.map((o, i) => {
        if (i === prev.ordersHistory.length - 1) {
          return { ...o, count: o.count + 1 };
        }
        return o;
      });

      return {
        ...prev,
        dailyRevenue: Math.round(daily * 100) / 100,
        weeklyRevenue: Math.round((prev.weeklyRevenue + total) * 100) / 100,
        monthlyRevenue: Math.round((prev.monthlyRevenue + total) * 100) / 100,
        totalOrders: totalOrd,
        ticketAverage: Math.round(ticketAvg * 100) / 100,
        revenueHistory: updatedRevenueHistory,
        ordersHistory: updatedOrdersHistory
      };
    });

    clearCart();
    return newOrder;
  };

  // ==================== REAL SERVER-SIDE AI ACTIONS ====================

  const generateAIDescription = async (productName: string, category: string, ingredients: string[]) => {
    try {
      const response = await fetch('/api/gemini/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, category, ingredients })
      });
      if (!response.ok) throw new Error("Erro na requisição da descrição por IA");
      return await response.json();
    } catch (error) {
      console.error("Erro generateAIDescription client-side:", error);
      // Fail-proof fallback on client
      return {
        description: `Delicioso ${productName} da nossa seção de ${category}. Produzido com técnicas exclusivas e ingredientes premium selecionados por nosso chef, incluindo ${ingredients.length > 0 ? ingredients.join(', ') : 'nossos temperos caseiros'}. Prato ideal para quem busca requinte e satisfação total.`,
        copy: `📣 Hora de se deliciar! O nosso maravilhoso ${productName} já está fazendo sucesso e você não pode ficar de fora. Faça seu pedido com apenas alguns cliques! 🍔✨`,
        keywords: [productName.toLowerCase(), category.toLowerCase(), "delicia", "luvia", "premium"]
      };
    }
  };

  const suggestAICombos = async () => {
    try {
      const response = await fetch('/api/gemini/suggest-promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });
      if (!response.ok) throw new Error("Erro ao sugerir promoções por IA");
      return await response.json();
    } catch (error) {
      console.error("Erro suggestAICombos client-side:", error);
      return {
        combos: [
          {
            name: "Combo Luvia Supreme",
            products: [products[0]?.name || "Item Principal", products[3]?.name || "Batata Rústica"],
            discountPercent: 15,
            description: "Uma sugestão perfeita que combina nosso produto mais querido com uma cobertura espetacular por um valor incrível."
          }
        ],
        bestHours: ["Quintas e Sextas-feiras de noite"],
        marketingStrategy: "Disparar mensagem em lote para clientes inativos com cupom relâmpago de 10% durante as 19h."
      };
    }
  };

  const analyzeAISales = async () => {
    const sorted = [...products].sort((a, b) => b.salesCount - a.salesCount);
    const topProducts = sorted.slice(0, 2).map(p => ({ name: p.name, sales: p.salesCount }));
    const lowPerformingProducts = sorted.slice(-2).map(p => ({ name: p.name, sales: p.salesCount }));

    try {
      const response = await fetch('/api/gemini/analyze-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesSummary: {
            daily: analytics.dailyRevenue,
            weekly: analytics.weeklyRevenue,
            monthly: analytics.monthlyRevenue,
            totalOrders: analytics.totalOrders,
            ticketAverage: analytics.ticketAverage
          },
          topProducts,
          lowPerformingProducts
        })
      });
      if (!response.ok) throw new Error("Erro ao analisar vendas por IA");
      return await response.json();
    } catch (error) {
      console.error("Erro analyzeAISales client-side:", error);
      return {
        lowPerformingAnalysis: "Alguns acompanhamentos e bebidas menos tradicionais têm baixa penetração de mercado. Oferecer degustações virtuais, cupons de desconto focados, ou fotos de altíssima definição ajudam a aumentar a conversão.",
        championsAnalysis: "Seus hambúrgueres tinto e batatas rústicas lideram com folga. Eles representam o carro-chefe da marca e devem sempre receber destaque no banner inicial do cardápio público.",
        opportunities: [
          "Criar combos casados de alta margem acoplando bebidas gourmet.",
          "Configurar cupons dinâmicos exclusivos para quem abandonou o carrinho.",
          "Ativar promoções relâmpago nas terças-feiras utilizando a inteligência de envio WhatsApp."
        ],
        forecastSummary: "Projeção de crescimento linear de 15% nas receitas semanais caso as recomendações de upsell na sacola de compras sejam implementadas."
      };
    }
  };

  // ==================== MANAGEMENT FUNCTIONS ====================

  const addProduct = (newProd: Omit<Product, 'id' | 'salesCount'>) => {
    const prod: Product = {
      ...newProd,
      id: `prod-${Math.floor(1000 + Math.random() * 9000)}`,
      salesCount: 0,
      salesSuccessRate: 'medium'
    };
    setProducts(prev => [...prev, prod]);
  };

  const updateProduct = (updatedProd: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status } : order
    ));
  };

  const addCoupon = (newCoupon: Coupon) => {
    setCoupons(prev => [newCoupon, ...prev]);
  };

  const addCategory = (newCat: Omit<Category, 'id'>) => {
    const cat: Category = {
      ...newCat,
      id: `cat-${Math.floor(1000 + Math.random() * 9000)}`
    };
    setCategories(prev => [...prev, cat]);
  };

  const updateCategory = (updatedCat: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // First-time trial signup: start from a completely blank workspace
  // (no demo products/orders/customers) so the client builds their own menu.
  // The e-mail/senha informed here become the credentials used to log back in later.
  const startBlankTrialAccount = (email: string, password: string) => {
    setRegisteredCredentials({ email, password });
    setVisualConfig(BLANK_VISUAL_CONFIG);
    setCategories([]);
    setProducts([]);
    setOrders([]);
    setCoupons([]);
    setCustomers([]);
    setAnalytics(BLANK_ANALYTICS);
    setCart([]);
    setAppliedCoupon(null);
    setIsAdmin(true);
    setLoggedIn(true);
    setCurrentView('dashboard');
  };

  // Mock login: checks e-mail/senha against the locally-stored trial account.
  // TODO: replace with a real backend authentication call.
  const attemptLogin = (email: string, password: string) => {
    if (!registeredCredentials) {
      return { success: false, message: 'Nenhuma conta encontrada com esse e-mail. Crie sua conta grátis primeiro.' };
    }
    if (
      registeredCredentials.email.trim().toLowerCase() !== email.trim().toLowerCase() ||
      registeredCredentials.password !== password
    ) {
      return { success: false, message: 'E-mail ou senha incorretos.' };
    }
    setIsAdmin(true);
    setLoggedIn(true);
    setCurrentView('dashboard');
    return { success: true, message: 'Login realizado com sucesso.' };
  };

  return (
    <AppContext.Provider value={{
      visualConfig,
      setVisualConfig,
      categories,
      setCategories,
      products,
      setProducts,
      orders,
      setOrders,
      coupons,
      setCoupons,
      customers,
      setCustomers,
      analytics,
      setAnalytics,
      currentView,
      setCurrentView,
      isAdmin,
      setIsAdmin,
      loggedIn,
      setLoggedIn,
      currentPlan,
      setCurrentPlan,
      publicView,
      setPublicView,
      registeredCredentials,
      startBlankTrialAccount,
      attemptLogin,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      appliedCoupon,
      applyCouponCode,
      removeCoupon,
      createOrder,
      generateAIDescription,
      suggestAICombos,
      analyzeAISales,
      addProduct,
      updateProduct,
      deleteProduct,
      updateOrderStatus,
      addCoupon,
      addCategory,
      updateCategory,
      deleteCategory
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
