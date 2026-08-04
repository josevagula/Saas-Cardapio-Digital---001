import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
import { useAuth } from './AuthContext';
import {
  fetchWorkspace,
  fetchPublicMenuBySlug,
  insertPublicOrder,
  incrementProductSales,
  recordCustomerOrder,
  syncCategories,
  syncProducts,
  syncOrders,
  syncCoupons,
  syncCustomers,
  syncVisualConfig,
  syncAnalytics
} from '../lib/workspaceRepo';

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
  // Billing status of the current account's subscription (mock only — no real payment gateway yet).
  // When 'cancelled', the admin dashboard renders blurred with a renewal prompt until renewPlan() is called.
  planStatus: 'active' | 'cancelled';
  cancelPlan: () => void;
  renewPlan: () => void;
  // Public (logged-out) marketing screens: landing, login, trial signup
  publicView: 'landing' | 'login' | 'trial';
  setPublicView: (view: 'landing' | 'login' | 'trial') => void;
  // Resets the workspace to a blank slate (no demo data) and enters the admin
  // dashboard. Called after a real Supabase signUp() succeeds — auth/credentials
  // are handled entirely by Supabase now, this only resets app-local state.
  resetToBlankWorkspace: () => void;
  // Enters the admin dashboard for an already-authenticated Supabase user
  // (called after a successful signInWithPassword()).
  enterAdminDashboard: () => void;
  // Shows the built-in mock dataset in the admin dashboard for prospects
  // trying the product from the landing page. Never reads or writes a real
  // Supabase account's data, even if one happens to be signed in already.
  enterDemoMode: () => void;

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
  // Identifies which Supabase account (if any) is signed in, so this
  // browser's saved workspace data can be isolated per account below —
  // otherwise two accounts sharing a device/browser would see each other's
  // (or the built-in demo's) products/orders/etc.
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  // Present only on a public menu link (?menu=<slug>) — resolves to that
  // specific account's data via Supabase below, regardless of who's viewing
  // it or whether they're signed in at all.
  const publicMenuSlug = new URLSearchParams(window.location.search).get('menu');

  // Restore states from localStorage or use initial mock data
  const [visualConfig, setVisualConfig] = useState<VisualConfig>(() => {
    const saved = localStorage.getItem('sushi_visual_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (!config.establishmentName || config.establishmentName.includes('Burger') || config.establishmentName.includes('Grill') || config.establishmentName === 'Sushi Gourmet') {
          config.establishmentName = 'Sushi & Temaki';
        }
        if (config.primaryColor === '#EC4899' || config.primaryColor === '#D85A30' || config.primaryColor === '#042C53' || config.primaryColor === '#2563EB') {
          config.primaryColor = '#F97316';
        }
        config.themeMode = 'dark';
        if (!config.menuSlug || config.menuSlug === 'sushi-burger') {
          config.menuSlug = 'delivery-sushi';
        }
        config.deliveryFee = typeof config.deliveryFee === 'number' && !isNaN(config.deliveryFee) ? config.deliveryFee : (parseFloat(config.deliveryFee as any) || 0);
        localStorage.setItem('sushi_visual_config', JSON.stringify(config));
        return config;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_VISUAL_CONFIG;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('sushi_categories');
    if (saved) {
      try {
        const parsed: Category[] = JSON.parse(saved);
        if (parsed.some(c => c.name.toLowerCase().includes('burguer') || c.name.toLowerCase().includes('artesanal'))) {
          localStorage.setItem('sushi_categories', JSON.stringify(INITIAL_CATEGORIES));
          return INITIAL_CATEGORIES;
        }
        return parsed;
      } catch (e) { console.error(e); }
    }
    return INITIAL_CATEGORIES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('sushi_products');
    if (saved) {
      try {
        const parsed: Product[] = JSON.parse(saved);
        if (parsed.some(p => p.name.toLowerCase().includes('burguer') || p.name.toLowerCase().includes('cheddar') || p.name.toLowerCase().includes('smash'))) {
          localStorage.setItem('sushi_products', JSON.stringify(INITIAL_PRODUCTS));
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
    const saved = localStorage.getItem('sushi_orders');
    if (saved) {
      try {
        const parsed: Order[] = JSON.parse(saved);
        // Old demo seed only ever contained these 5 orders — refresh browsers
        // still holding that stale snapshot to the fuller current seed.
        const oldDemoIds = new Set(['LUV-4008', 'LUV-4009', 'LUV-4010', 'LUV-4011', 'LUV-4012']);
        const isStaleDemoSeed = parsed.length > 0 && parsed.every(o => oldDemoIds.has(o.id));
        if (isStaleDemoSeed || parsed.some(o => o.items?.some(i => i.product?.name?.toLowerCase().includes('burguer')))) {
          localStorage.setItem('sushi_orders', JSON.stringify(INITIAL_ORDERS));
          return INITIAL_ORDERS;
        }
        return parsed;
      } catch (e) { console.error(e); }
    }
    return INITIAL_ORDERS;
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('sushi_coupons');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });

  const [customers, setCustomers] = useState<CustomerInfo[]>(() => {
    const saved = localStorage.getItem('sushi_customers');
    if (saved) {
      try {
        const parsed: CustomerInfo[] = JSON.parse(saved);
        // Filter out test data entries
        const clean = parsed.filter(c => c.name && !/^[0-9a-zA-Z]{3,6}$/.test(c.name) && c.name.length > 2 && c.name !== "23413" && c.name !== "12312" && c.name !== "gdfg" && c.name !== "dfgd" && c.name !== "fafds");
        // Old demo seed only ever contained these 6 customers — refresh
        // browsers still holding that stale snapshot to the fuller current seed.
        const oldDemoIds = new Set(['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5', 'cust-6']);
        const isStaleDemoSeed = clean.length > 0 && clean.every(c => oldDemoIds.has(c.id));
        if (isStaleDemoSeed) {
          localStorage.setItem('sushi_customers', JSON.stringify(INITIAL_CUSTOMERS));
          return INITIAL_CUSTOMERS;
        }
        if (clean.length > 0) return clean;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_CUSTOMERS;
  });

  const [analytics, setAnalytics] = useState<SalesAnalytics>(() => {
    const saved = localStorage.getItem('sushi_analytics');
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
  const [planStatus, setPlanStatus] = useState<'active' | 'cancelled'>(() => {
    return localStorage.getItem('sushi_plan_status') === 'cancelled' ? 'cancelled' : 'active';
  });
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'trial'>('landing');

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

  // Workspace data (visual config, catalog, orders, etc.) lives in Supabase,
  // scoped to the signed-in account, once one is known — real, persistent
  // storage instead of a browser-local blob, and isolated per account so a
  // second account signing in on the same device never sees the first
  // account's (or the built-in demo's) data. Anonymous browsing (the public
  // menu preview / landing page, no Supabase session) keeps using the old
  // flat localStorage keys below, since there's no account to save under.
  const scopedKey = (base: string) => `sushi_${base}`;
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const loadedUserIdRef = useRef<string | null | undefined>(undefined);
  // True only while showing the landing page's "Demonstração" mock dataset.
  // Guards every sync-to-Supabase/localStorage effect below so demo
  // interactions never leak into (or read from) a real signed-in account.
  const [isDemoMode, setIsDemoMode] = useState(false);
  // The restaurant account that owns the currently-viewed public menu link
  // (resolved from the slug below) — lets createOrder() save a customer's
  // order under that specific restaurant even though the customer has no
  // account/session of their own.
  const [publicMenuOwnerId, setPublicMenuOwnerId] = useState<string | null>(null);

  useEffect(() => {
    // A public menu link resolves by slug, independent of any signed-in
    // session — takes priority over the account-based load below so a
    // customer browsing someone else's restaurant never sees their own
    // account's data (or vice versa).
    if (publicMenuSlug) {
      setIsDemoMode(false);
      setWorkspaceReady(false);
      fetchPublicMenuBySlug(publicMenuSlug).then(data => {
        if (data) {
          setPublicMenuOwnerId(data.ownerId);
          setVisualConfig(data.visualConfig);
          setCategories(data.categories);
          setProducts(data.products);
          setCoupons(data.coupons);
        }
        setWorkspaceReady(true);
      });
      return;
    }

    if (authLoading) return;
    if (loadedUserIdRef.current === userId) {
      setWorkspaceReady(true);
      return;
    }
    loadedUserIdRef.current = userId;

    if (userId) {
      setIsDemoMode(false);
      setWorkspaceReady(false);
      fetchWorkspace(userId).then(data => {
        setVisualConfig(data.visualConfig ?? BLANK_VISUAL_CONFIG);
        setCategories(data.categories);
        setProducts(data.products);
        setOrders(data.orders);
        setCoupons(data.coupons);
        setCustomers(data.customers);
        setAnalytics(data.analytics ?? BLANK_ANALYTICS);
        setWorkspaceReady(true);
      });
      return;
    }
    setWorkspaceReady(true);
  }, [userId, authLoading, publicMenuSlug]);

  // Sync state to Supabase (or, for anonymous/no-account browsing, to the
  // old flat localStorage keys) on modification — skipped until the
  // account-scoped workspace above has finished loading, so we never
  // overwrite a saved account's data with another account's stale state.
  useEffect(() => {
    if (!workspaceReady || isDemoMode) return;
    if (userId) {
      syncVisualConfig(userId, visualConfig);
    } else {
      safeSetLocalStorage(scopedKey('visual_config'), visualConfig);
    }
    if (visualConfig.establishmentName) {
      document.title = `Zushy - ${visualConfig.establishmentName}`;
    } else {
      document.title = 'Zushy';
    }
  }, [visualConfig, workspaceReady, userId, isDemoMode]);

  useEffect(() => {
    if (!workspaceReady || isDemoMode) return;
    if (userId) {
      syncCategories(userId, categories);
    } else {
      safeSetLocalStorage(scopedKey('categories'), categories);
    }
  }, [categories, workspaceReady, userId, isDemoMode]);

  useEffect(() => {
    if (!workspaceReady || isDemoMode) return;
    if (userId) {
      syncProducts(userId, products);
    } else {
      safeSetLocalStorage(scopedKey('products'), products);
    }
  }, [products, workspaceReady, userId, isDemoMode]);

  useEffect(() => {
    if (!workspaceReady || isDemoMode) return;
    if (userId) {
      syncOrders(userId, orders);
    } else {
      safeSetLocalStorage(scopedKey('orders'), orders);
    }
  }, [orders, workspaceReady, userId, isDemoMode]);

  useEffect(() => {
    if (!workspaceReady || isDemoMode) return;
    if (userId) {
      syncCoupons(userId, coupons);
    } else {
      safeSetLocalStorage(scopedKey('coupons'), coupons);
    }
  }, [coupons, workspaceReady, userId, isDemoMode]);

  useEffect(() => {
    if (!workspaceReady || isDemoMode) return;
    if (userId) {
      syncCustomers(userId, customers);
    } else {
      safeSetLocalStorage(scopedKey('customers'), customers);
    }
  }, [customers, workspaceReady, userId, isDemoMode]);

  useEffect(() => {
    if (!workspaceReady || isDemoMode) return;
    if (userId) {
      syncAnalytics(userId, analytics);
    } else {
      safeSetLocalStorage(scopedKey('analytics'), analytics);
    }
  }, [analytics, workspaceReady, userId, isDemoMode]);

  useEffect(() => {
    safeSetLocalStorage('sushi_plan_status', planStatus);
  }, [planStatus]);

  // One-time cleanup: earlier versions of this app stored login credentials
  // (including the plaintext password) in localStorage as a mock auth system.
  // Auth is now handled entirely by Supabase, so purge any leftover copy.
  useEffect(() => {
    localStorage.removeItem('sushi_account_credentials');
  }, []);

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

    // Update orders list (local state, e.g. for the confirmation screen)
    setOrders(prev => [newOrder, ...prev]);

    // Save the order — and its side effects (sales count, loyalty points) —
    // to the restaurant's own Supabase account. One-shot calls, not the
    // admin-side syncOrders/syncProducts/syncCustomers resyncs, since this
    // customer's local state only ever holds their own order, never the
    // restaurant's full history.
    if (publicMenuOwnerId) {
      insertPublicOrder(publicMenuOwnerId, newOrder);
      cart.forEach(item => {
        incrementProductSales(publicMenuOwnerId, item.product.id, item.quantity);
      });
      recordCustomerOrder(publicMenuOwnerId, customer, pointsEarned);
    }

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
        keywords: [productName.toLowerCase(), category.toLowerCase(), "delicia", "sushi", "premium"]
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
      // Fail-proof fallback: only ever reference products that actually exist in the cardápio.
      const realNames = products.map(p => p.name).filter(Boolean);
      const fallbackCombos = realNames.length >= 2
        ? [{
            name: `Combo Sushi Supreme: ${realNames[0]} + ${realNames[1]}`,
            products: [realNames[0], realNames[1]],
            discountPercent: 15,
            description: "Uma sugestão perfeita que combina dois produtos já cadastrados no seu cardápio por um valor incrível."
          }]
        : realNames.length === 1
          ? [{
              name: `Oferta Especial: ${realNames[0]}`,
              products: [realNames[0]],
              discountPercent: 10,
              description: "Um desconto exclusivo no seu produto cadastrado para atrair mais pedidos."
            }]
          : [];
      return {
        combos: fallbackCombos,
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
  // Auth already happened via supabase.auth.signUp() before this is called —
  // this only resets app-local state and enters the dashboard.
  const resetToBlankWorkspace = () => {
    setIsDemoMode(false);
    setVisualConfig(BLANK_VISUAL_CONFIG);
    setCategories([]);
    setProducts([]);
    setOrders([]);
    setCoupons([]);
    setCustomers([]);
    setAnalytics(BLANK_ANALYTICS);
    setCart([]);
    setAppliedCoupon(null);
    setPlanStatus('active');
    setIsAdmin(true);
    setLoggedIn(true);
    setCurrentView('dashboard');
  };

  // Mock billing actions (no real payment gateway yet). Cancelling keeps the account
  // logged in but locks the dashboard behind a blurred renewal prompt (see App.tsx);
  // renewing clears that lock and restores full access, including o Cardápio Digital.
  const cancelPlan = () => setPlanStatus('cancelled');
  const renewPlan = () => setPlanStatus('active');

  // Enters the admin dashboard for an already-authenticated Supabase user.
  // Workspace data isn't reset here — it's loaded automatically by the
  // account-scoped effect above, keyed to this specific account's id, so it
  // shows that account's own saved data (or a blank slate if it has none)
  // rather than resetToBlankWorkspace's forced wipe, used only for brand-new
  // trial signups.
  const enterAdminDashboard = () => {
    setIsDemoMode(false);
    setIsAdmin(true);
    setLoggedIn(true);
    setCurrentView('dashboard');
  };

  // Shows the built-in mock dataset in the admin dashboard for prospects
  // trying the product from the landing page. Forces the demo dataset into
  // local state and flags isDemoMode so the sync effects above never read
  // from or write to a real account — even if one happens to already be
  // signed in on this browser (e.g. the owner testing their own account).
  const enterDemoMode = () => {
    setIsDemoMode(true);
    setVisualConfig(INITIAL_VISUAL_CONFIG);
    setCategories(INITIAL_CATEGORIES);
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setCoupons(INITIAL_COUPONS);
    setCustomers(INITIAL_CUSTOMERS);
    setAnalytics(INITIAL_ANALYTICS);
    setCart([]);
    setAppliedCoupon(null);
    setIsAdmin(true);
    setLoggedIn(true);
    setCurrentView('dashboard');
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
      planStatus,
      cancelPlan,
      renewPlan,
      publicView,
      setPublicView,
      resetToBlankWorkspace,
      enterAdminDashboard,
      enterDemoMode,
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
