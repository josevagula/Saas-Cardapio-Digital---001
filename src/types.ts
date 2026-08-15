export interface VisualConfig {
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string; // Hex e.g., "#FF6A00"
  fontFamily: 'sans' | 'display' | 'mono';
  themeMode: 'light' | 'dark';
  establishmentName: string;
  // Subtitle shown under the establishment name on the public menu's hero
  // banner — configurable per tenant, unlike the fixed "DELIVERY • CARDÁPIO
  // DIGITAL" tagline in the top navbar.
  menuDescription?: string;
  phone: string;
  address: string;
  deliveryFee: number;
  menuSlug: string;
  // Visual style of the category navigation bar on the public menu.
  // 'default' is the original pill-with-outline style; 'komy' is the
  // capsule-container / uppercase-letterspaced / solid-orange-active style.
  categoryStyle?: 'default' | 'komy';
  // Horário de Atendimento e Status
  openingTime?: string; // e.g. "18:00"
  closingTime?: string; // e.g. "23:30"
  openingDays?: string; // e.g. "Segunda a Domingo"
  operatingDaysList?: string[]; // e.g. ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
  deliveryTime?: string; // e.g. "30-45 min"
  autoStatusByTime?: boolean; // Se true, verifica automaticamente pelo horário atual
  isStoreOpenManual?: boolean; // Status manual (true = Aberto, false = Fechado)
  // Sushi Kit Auto Config
  autoKitConfig?: {
    shoyuPerItems: number; // e.g. 1 shoyu per 10 pieces
    includeWasabi: boolean;
    includeGengibre: boolean;
    napkinsPerItem: number;
  };
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
}

export interface SushiExtra {
  id: string;
  name: string;
  price: number;
  isFree: boolean;
  freeLimit?: number;
}

// An extra/add-on the restaurant offers for a specific product (e.g. "Cream
// Cheese Extra", up to 3x, R$3 each) — configured per product by the admin,
// picked by the customer on the public menu.
export interface ProductExtra {
  id: string;
  name: string;
  price: number;
  maxQuantity: number;
}

export interface ComboFlavorOption {
  id: string;
  name: string;
  category: 'sashimi' | 'uramaki' | 'hossomaki' | 'hotroll' | 'nigiri' | 'niguiri';
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  // A product can belong to more than one category at once (e.g. a combo
  // that's both in "Combos" and "Destaques"). Always has at least one entry.
  categoryIds: string[];
  imageUrl: string;
  isAvailable: boolean;
  ingredients: string[];
  salesCount: number;
  tags?: string[];
  // AI metadata
  salesSuccessRate?: 'high' | 'medium' | 'low';
  // Sushi Specialized Attributes
  isComboBuilder?: boolean;
  totalPieces?: number; // e.g. 20, 30, 50, 100
  supportsHalfAndHalf?: boolean;
  halfAndHalfFlavors?: string[];
  // Optional paid add-ons a customer can pick on the public menu for this
  // specific product (e.g. extra cream cheese). Absent/empty = no add-ons.
  extras?: ProductExtra[];
  // Controls position within a category's product list (lower = earlier).
  // Undefined for products that haven't been manually reordered yet — those
  // sort after any with an explicit value.
  displayOrder?: number;
}

export type OrderStatus = 'received' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash';
export type DeliveryMethod = 'delivery' | 'pickup' | 'dine_in';

export interface SelectedComboPiece {
  flavorName: string;
  pieces: number;
}

export interface SelectedHalfAndHalf {
  flavor1: string;
  flavor2: string;
}

export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  notes?: string;
  removedIngredients?: string[];
  // Sushi Customizations
  comboFlavors?: SelectedComboPiece[];
  halfAndHalf?: SelectedHalfAndHalf;
  extras?: SelectedExtra[];
  hashiCount?: number;
}

export interface KitAutoIncluded {
  shoyuSachets: number;
  wasabiPortions: number;
  gengibrePortions: number;
  guardanapos: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  pointsEarned: number;
  couponCode?: string;
  notes?: string;
  needsChange?: boolean;
  changeAmount?: string;
  // Sushi Delivery Specifics
  hashiCount?: number;
  kitAutoIncluded?: KitAutoIncluded;
  isUpsellOrder?: boolean;
  // Per-restaurant sequential number (1, 2, 3...), shown as PED-0001 in the
  // admin order screen. Assigned asynchronously after the order is placed —
  // absent (undefined) until then, so it's optional.
  orderNumber?: number;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_delivery';
  value: number; // e.g., 10 for 10% or 10 BRL
  minOrderValue: number;
  isFirstPurchaseOnly?: boolean;
  active: boolean;
}

export type VIPTier = 'Bronze' | 'Prata' | 'Ouro' | 'Diamond';

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  loyaltyPoints: number;
  orderCount: number;
  lastOrderDate: string;
  vipTier?: VIPTier;
  favoriteCombo?: string;
  isSushiLoversSub?: boolean;
}

export interface SalesAnalytics {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  ticketAverage: number;
  activeCustomers: number;
  repurchaseRate: number; // %
  sushiTypeDistribution: { name: string; value: number }[];
  revenueHistory: { date: string; amount: number }[];
  ordersHistory: { date: string; count: number }[];
  paymentDistribution: { name: string; value: number }[];
}

export interface SubscriptionPlan {
  id: 'basic' | 'pro' | 'premium';
  name: string;
  price: number;
  features: string[];
}

