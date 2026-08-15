import { supabase } from './supabase';
import type {
  Category,
  Product,
  Order,
  Coupon,
  CustomerInfo,
  VisualConfig,
  SalesAnalytics
} from '../types';

// Maps this app's camelCase domain types to/from the snake_case Supabase
// tables created in supabase/migrations/20260801170000_create_workspace_tables.sql,
// and syncs local state to those tables so a signed-in account's data is
// real, persistent, and isolated per account instead of living only in
// browser localStorage.

const categoryToRow = (c: Category, userId: string) => ({
  id: c.id,
  user_id: userId,
  name: c.name,
  icon: c.icon
});

const rowToCategory = (r: any): Category => ({
  id: r.id,
  name: r.name,
  icon: r.icon
});

const productToRow = (p: Product, userId: string) => ({
  id: p.id,
  user_id: userId,
  // category_id (singular) is kept in sync as the first category, purely as
  // a legacy/safety-net column — category_ids is what the app actually reads.
  category_id: p.categoryIds?.[0] || null,
  category_ids: p.categoryIds || [],
  name: p.name,
  description: p.description,
  price: p.price,
  promo_price: p.promoPrice ?? null,
  image_url: p.imageUrl,
  is_available: p.isAvailable,
  ingredients: p.ingredients || [],
  sales_count: p.salesCount,
  tags: p.tags ?? null,
  sales_success_rate: p.salesSuccessRate ?? null,
  is_combo_builder: p.isComboBuilder ?? null,
  total_pieces: p.totalPieces ?? null,
  supports_half_and_half: p.supportsHalfAndHalf ?? null,
  half_and_half_flavors: p.halfAndHalfFlavors ?? null,
  extras: p.extras ?? [],
  display_order: p.displayOrder ?? null
});

const rowToProduct = (r: any): Product => ({
  id: r.id,
  categoryIds: r.category_ids && r.category_ids.length > 0 ? r.category_ids : (r.category_id ? [r.category_id] : []),
  name: r.name,
  description: r.description,
  price: Number(r.price) || 0,
  promoPrice: r.promo_price != null ? Number(r.promo_price) : undefined,
  imageUrl: r.image_url,
  isAvailable: r.is_available,
  ingredients: r.ingredients || [],
  salesCount: r.sales_count,
  tags: r.tags ?? undefined,
  salesSuccessRate: r.sales_success_rate ?? undefined,
  isComboBuilder: r.is_combo_builder ?? undefined,
  totalPieces: r.total_pieces ?? undefined,
  supportsHalfAndHalf: r.supports_half_and_half ?? undefined,
  halfAndHalfFlavors: r.half_and_half_flavors ?? undefined,
  extras: r.extras ?? [],
  displayOrder: r.display_order ?? undefined
});

const orderToRow = (o: Order, userId: string) => ({
  id: o.id,
  user_id: userId,
  customer_name: o.customerName,
  customer_phone: o.customerPhone,
  customer_email: o.customerEmail ?? null,
  customer_address: o.customerAddress ?? null,
  items: o.items,
  status: o.status,
  payment_method: o.paymentMethod,
  delivery_method: o.deliveryMethod,
  delivery_fee: o.deliveryFee,
  discount_amount: o.discountAmount,
  total: o.total,
  created_at: o.createdAt,
  points_earned: o.pointsEarned,
  coupon_code: o.couponCode ?? null,
  notes: o.notes ?? null,
  needs_change: o.needsChange ?? null,
  change_amount: o.changeAmount ?? null,
  hashi_count: o.hashiCount ?? null,
  kit_auto_included: o.kitAutoIncluded ?? null,
  is_upsell_order: o.isUpsellOrder ?? null
  // order_number deliberately omitted — it's only ever written by the
  // assign_order_number RPC below, never by this general upsert (used both
  // for the initial public insert and the admin's routine syncOrders). If it
  // were included here, an admin syncOrders firing between the order's
  // insert and assign_order_number's completion would upsert a stale/null
  // value and clobber the number the RPC had just assigned.
});

const rowToOrder = (r: any): Order => ({
  id: r.id,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  customerEmail: r.customer_email ?? undefined,
  customerAddress: r.customer_address ?? undefined,
  items: r.items || [],
  status: r.status,
  paymentMethod: r.payment_method,
  deliveryMethod: r.delivery_method,
  deliveryFee: Number(r.delivery_fee) || 0,
  discountAmount: Number(r.discount_amount) || 0,
  total: Number(r.total) || 0,
  createdAt: r.created_at,
  pointsEarned: r.points_earned,
  couponCode: r.coupon_code ?? undefined,
  notes: r.notes ?? undefined,
  needsChange: r.needs_change ?? undefined,
  changeAmount: r.change_amount ?? undefined,
  hashiCount: r.hashi_count ?? undefined,
  kitAutoIncluded: r.kit_auto_included ?? undefined,
  isUpsellOrder: r.is_upsell_order ?? undefined,
  orderNumber: r.order_number ?? undefined
});

const couponToRow = (c: Coupon, userId: string) => ({
  code: c.code,
  user_id: userId,
  discount_type: c.discountType,
  value: c.value,
  min_order_value: c.minOrderValue,
  is_first_purchase_only: c.isFirstPurchaseOnly ?? null,
  active: c.active
});

const rowToCoupon = (r: any): Coupon => ({
  code: r.code,
  discountType: r.discount_type,
  value: Number(r.value) || 0,
  minOrderValue: Number(r.min_order_value) || 0,
  isFirstPurchaseOnly: r.is_first_purchase_only ?? undefined,
  active: r.active
});

const customerToRow = (c: CustomerInfo, userId: string) => ({
  id: c.id,
  user_id: userId,
  name: c.name,
  phone: c.phone,
  email: c.email || null,
  address: c.address || null,
  loyalty_points: c.loyaltyPoints,
  order_count: c.orderCount,
  last_order_date: c.lastOrderDate || null,
  vip_tier: c.vipTier ?? null,
  favorite_combo: c.favoriteCombo ?? null,
  is_sushi_lovers_sub: c.isSushiLoversSub ?? null
});

const rowToCustomer = (r: any): CustomerInfo => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email || '',
  address: r.address || '',
  loyaltyPoints: r.loyalty_points,
  orderCount: r.order_count,
  lastOrderDate: r.last_order_date || '',
  vipTier: r.vip_tier ?? undefined,
  favoriteCombo: r.favorite_combo ?? undefined,
  isSushiLoversSub: r.is_sushi_lovers_sub ?? undefined
});

const visualConfigToRow = (v: VisualConfig, userId: string) => ({
  user_id: userId,
  logo_url: v.logoUrl,
  banner_url: v.bannerUrl,
  primary_color: v.primaryColor,
  font_family: v.fontFamily,
  theme_mode: v.themeMode,
  establishment_name: v.establishmentName,
  menu_description: v.menuDescription ?? null,
  phone: v.phone,
  address: v.address,
  delivery_fee: v.deliveryFee,
  menu_slug: v.menuSlug || null,
  category_style: v.categoryStyle || null,
  opening_time: v.openingTime ?? null,
  closing_time: v.closingTime ?? null,
  opening_days: v.openingDays ?? null,
  operating_days_list: v.operatingDaysList ?? null,
  delivery_time: v.deliveryTime ?? null,
  auto_status_by_time: v.autoStatusByTime ?? null,
  is_store_open_manual: v.isStoreOpenManual ?? null,
  auto_kit_config: v.autoKitConfig ?? null,
  updated_at: new Date().toISOString()
});

const rowToVisualConfig = (r: any): VisualConfig => ({
  logoUrl: r.logo_url || '',
  bannerUrl: r.banner_url || '',
  primaryColor: r.primary_color,
  fontFamily: r.font_family,
  themeMode: r.theme_mode,
  establishmentName: r.establishment_name || '',
  menuDescription: r.menu_description ?? undefined,
  phone: r.phone || '',
  address: r.address || '',
  deliveryFee: Number(r.delivery_fee) || 0,
  menuSlug: r.menu_slug || '',
  categoryStyle: r.category_style || 'default',
  openingTime: r.opening_time ?? undefined,
  closingTime: r.closing_time ?? undefined,
  openingDays: r.opening_days ?? undefined,
  operatingDaysList: r.operating_days_list ?? undefined,
  deliveryTime: r.delivery_time ?? undefined,
  autoStatusByTime: r.auto_status_by_time ?? undefined,
  isStoreOpenManual: r.is_store_open_manual ?? undefined,
  autoKitConfig: r.auto_kit_config ?? undefined
});

// Upserts every current row and deletes any row still owned by this user
// that isn't in the current set anymore — keeps a table's contents an exact
// mirror of local state without needing per-mutation insert/update/delete
// wiring at every call site.
async function syncRows(table: string, userId: string, rows: Record<string, any>[], onConflict: string, idColumn: string) {
  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from(table).upsert(rows, { onConflict });
    if (upsertError) {
      throw new Error(`Failed to save ${table} to Supabase: ${upsertError.message}`);
    }
  }

  let deleteQuery = supabase.from(table).delete().eq('user_id', userId);
  if (rows.length > 0) {
    const ids = rows.map(r => r[idColumn]);
    deleteQuery = deleteQuery.not(idColumn, 'in', `(${ids.map(id => `"${id}"`).join(',')})`);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    throw new Error(`Failed to prune removed ${table} rows in Supabase: ${deleteError.message}`);
  }
}

export async function fetchWorkspace(userId: string): Promise<{
  visualConfig: VisualConfig | null;
  categories: Category[];
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  customers: CustomerInfo[];
  analytics: SalesAnalytics | null;
  subscriptionStatus: string;
}> {
  const [categoriesRes, productsRes, ordersRes, couponsRes, customersRes, visualConfigRes, analyticsRes, profileRes] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('products').select('*').eq('user_id', userId).order('display_order', { ascending: true, nullsFirst: false }),
    supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('coupons').select('*').eq('user_id', userId),
    supabase.from('customers').select('*').eq('user_id', userId),
    supabase.from('visual_configs').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('analytics_snapshots').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('subscription_status').eq('id', userId).maybeSingle()
  ]);

  // A failed read must never be treated as "this account has no data" — the
  // caller mirrors whatever it receives back to Supabase (deleting rows that
  // are missing locally), so silently downgrading an error into an empty
  // array here would turn a transient network/Supabase hiccup into a
  // permanent data-loss event for the account. Throw instead and let the
  // caller retry without touching local state until a load actually succeeds.
  const failures: string[] = [];
  if (categoriesRes.error) failures.push(`categorias: ${categoriesRes.error.message}`);
  if (productsRes.error) failures.push(`produtos: ${productsRes.error.message}`);
  if (ordersRes.error) failures.push(`pedidos: ${ordersRes.error.message}`);
  if (couponsRes.error) failures.push(`cupons: ${couponsRes.error.message}`);
  if (customersRes.error) failures.push(`clientes: ${customersRes.error.message}`);
  if (visualConfigRes.error) failures.push(`configuração visual: ${visualConfigRes.error.message}`);
  if (analyticsRes.error) failures.push(`análises: ${analyticsRes.error.message}`);
  if (profileRes.error) failures.push(`assinatura: ${profileRes.error.message}`);

  if (failures.length > 0) {
    throw new Error(`Falha ao carregar dados da conta do Supabase: ${failures.join('; ')}`);
  }

  return {
    visualConfig: visualConfigRes.data ? rowToVisualConfig(visualConfigRes.data) : null,
    categories: (categoriesRes.data || []).map(rowToCategory),
    products: (productsRes.data || []).map(rowToProduct),
    orders: (ordersRes.data || []).map(rowToOrder),
    coupons: (couponsRes.data || []).map(rowToCoupon),
    customers: (customersRes.data || []).map(rowToCustomer),
    analytics: analyticsRes.data ? (analyticsRes.data.data as SalesAnalytics) : null,
    subscriptionStatus: (profileRes.data?.subscription_status as string | undefined) ?? 'trialing'
  };
}

// Re-checks just the billing status, used after the browser returns from a
// Stripe Checkout or Billing Portal redirect so the dashboard unlocks/locks
// immediately instead of waiting for the next full page load.
export async function fetchSubscriptionStatus(userId: string): Promise<string> {
  const { data, error } = await supabase.from('profiles').select('subscription_status').eq('id', userId).maybeSingle();
  if (error) throw new Error(`Falha ao verificar status da assinatura: ${error.message}`);
  return (data?.subscription_status as string | undefined) ?? 'trialing';
}

export const syncCategories = (userId: string, categories: Category[]) =>
  syncRows('categories', userId, categories.map(c => categoryToRow(c, userId)), 'id', 'id');

export const syncProducts = (userId: string, products: Product[]) =>
  syncRows('products', userId, products.map(p => productToRow(p, userId)), 'id', 'id');

// Orders are append/update only — deliberately not routed through syncRows
// above, which deletes any remote row missing from the local list. Order
// history is a permanent record: it must survive a stale browser cache, a
// failed fetch, or a bug in local state, none of which should ever be able
// to erase a real past sale. The database enforces this too — see
// supabase/migrations/20260807140000_orders_append_only.sql, which removes
// the DELETE policy/grant on public.orders entirely.
export async function syncOrders(userId: string, orders: Order[]) {
  if (orders.length === 0) return;
  const { error } = await supabase.from('orders').upsert(orders.map(o => orderToRow(o, userId)), { onConflict: 'id' });
  if (error) throw new Error(`Failed to save orders to Supabase: ${error.message}`);
}

export const syncCoupons = (userId: string, coupons: Coupon[]) =>
  syncRows('coupons', userId, coupons.map(c => couponToRow(c, userId)), 'user_id,code', 'code');

export const syncCustomers = (userId: string, customers: CustomerInfo[]) =>
  syncRows('customers', userId, customers.map(c => customerToRow(c, userId)), 'id', 'id');

// Resolves a public menu link (?menu=<slug>) to its owning account's
// branding, catalog and active coupons, without requiring the viewer to be
// signed in — this is what lets a real customer open the link on their own
// phone and see that specific restaurant, not whatever's cached locally.
export async function fetchPublicMenuBySlug(slug: string): Promise<{
  ownerId: string;
  visualConfig: VisualConfig;
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
} | null> {
  const { data: configRow, error: configError } = await supabase
    .from('visual_configs')
    .select('*')
    .eq('menu_slug', slug)
    .maybeSingle();

  if (configError) {
    console.error('Failed to resolve public menu by slug:', configError.message);
    return null;
  }
  if (!configRow) return null;

  const userId = configRow.user_id as string;
  const [categoriesRes, productsRes, couponsRes] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('products').select('*').eq('user_id', userId).order('display_order', { ascending: true, nullsFirst: false }),
    supabase.from('coupons').select('*').eq('user_id', userId).eq('active', true)
  ]);

  if (categoriesRes.error) console.error('Failed to load public menu categories:', categoriesRes.error.message);
  if (productsRes.error) console.error('Failed to load public menu products:', productsRes.error.message);
  if (couponsRes.error) console.error('Failed to load public menu coupons:', couponsRes.error.message);

  return {
    ownerId: userId,
    visualConfig: rowToVisualConfig(configRow),
    categories: (categoriesRes.data || []).map(rowToCategory),
    products: (productsRes.data || []).map(rowToProduct),
    coupons: (couponsRes.data || []).map(rowToCoupon)
  };
}

// One-shot insert for an order placed by an anonymous customer on a public
// menu link — deliberately NOT the upsert-all/delete-missing syncOrders
// helper above, since a customer's local `orders` state only ever holds the
// order(s) they personally just placed, never the restaurant's full order
// history (that's never fetched for the public view, to avoid leaking every
// past customer's name/phone/address to anyone with the menu link).
// Reconciling against that partial local list would delete the rest of the
// restaurant's real orders.
export async function insertPublicOrder(ownerId: string, order: Order) {
  const { error } = await supabase.from('orders').insert(orderToRow(order, ownerId));
  if (error) throw new Error(`Failed to save order to Supabase: ${error.message}`);
}

// Both call narrowly-scoped SECURITY DEFINER functions (see the
// public_order_side_effects migration) rather than updating products/
// customers directly — anon has no general UPDATE/INSERT grant on those
// tables, so a stranger can't rewrite a product's price or tamper with
// another customer's loyalty points.
export async function incrementProductSales(ownerId: string, productId: string, quantity: number) {
  const { error } = await supabase.rpc('increment_product_sales', {
    p_user_id: ownerId,
    p_product_id: productId,
    p_quantity: quantity
  });
  if (error) throw new Error(`Failed to update product sales count: ${error.message}`);
}

export async function recordCustomerOrder(
  ownerId: string,
  customer: { name: string; phone: string; email?: string; address?: string },
  points: number
) {
  const { error } = await supabase.rpc('record_customer_order', {
    p_user_id: ownerId,
    p_name: customer.name,
    p_phone: customer.phone,
    p_email: customer.email || '',
    p_address: customer.address || '',
    p_points: points
  });
  if (error) throw new Error(`Failed to update customer loyalty record: ${error.message}`);
}

// Hands this order the next sequential number for its restaurant (shown as
// PED-0001, PED-0002... in the admin order screen). The RPC raises if the
// order row isn't there yet, so a retry here just waits for
// insertPublicOrder to land — the counter has already moved on by then, so
// no number is ever reused.
export async function assignOrderNumber(ownerId: string, orderId: string) {
  const { error } = await supabase.rpc('assign_order_number', {
    p_user_id: ownerId,
    p_order_id: orderId
  });
  if (error) throw new Error(`Failed to assign order number: ${error.message}`);
}

export async function syncVisualConfig(userId: string, visualConfig: VisualConfig) {
  const { error } = await supabase.from('visual_configs').upsert(visualConfigToRow(visualConfig, userId), { onConflict: 'user_id' });
  if (error) throw new Error(`Failed to save visual config to Supabase: ${error.message}`);
}

export async function syncAnalytics(userId: string, analytics: SalesAnalytics) {
  const { error } = await supabase
    .from('analytics_snapshots')
    .upsert({ user_id: userId, data: analytics, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(`Failed to save analytics to Supabase: ${error.message}`);
}
