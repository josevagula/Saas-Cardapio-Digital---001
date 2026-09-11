import { supabase } from './supabase';
import type {
  Category,
  Product,
  Order,
  Coupon,
  CustomerInfo,
  VisualConfig,
  SalesAnalytics,
  Revenue,
  Expense,
  CashAdjustment,
  FinanceSettings,
  FinancialTransaction,
  CashFlowDay,
  DreReport,
  DreBreakdown
} from '../types';

// Maps this app's camelCase domain types to/from the snake_case Supabase
// tables created in supabase/migrations/20260801170000_create_workspace_tables.sql,
// and syncs local state to those tables so a signed-in account's data is
// real, persistent, and isolated per account instead of living only in
// browser localStorage.

// TEMPORARILY REVERTED (2026-09-09): this used to also write a
// display_order column persisting the categories array's position — but the
// migration that adds that column (supabase/migrations/20260909120000_
// category_display_order.sql) hasn't been applied to production yet, so
// every account's upsert was failing with "column does not exist",
// stranding the whole app on the loading screen (fetchWorkspace retries
// forever on error). Restore the display_order field/param here once that
// migration is confirmed applied, and restore the matching .order() calls
// below and in fetchWorkspace/fetchPublicMenuBySlug.
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
  category_display_order: p.categoryDisplayOrder ?? {}
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
  categoryDisplayOrder: r.category_display_order ?? undefined
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
  loyalty_config: v.loyaltyConfig ?? null,
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
  autoKitConfig: r.auto_kit_config ?? undefined,
  loyaltyConfig: r.loyalty_config ?? undefined
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
    // Real ordering is per-category (category_display_order) and applied
    // client-side wherever products are filtered down to one category — a
    // flat cross-category order-by can't reflect that. This just keeps the
    // base fetch stable/insertion-ordered.
    supabase.from('products').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
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
// supabase/migrations/20260807140000_orders_append_only.sql (no delete at
// all) and 20260824120000_allow_delete_cancelled_orders.sql, which reopens
// deletion only for the owner's own already-cancelled orders — the one path
// the dashboard's "excluir pedido" button uses, via deleteOrderRow below.
export async function syncOrders(userId: string, orders: Order[]) {
  if (orders.length === 0) return;
  const { error } = await supabase.from('orders').upsert(orders.map(o => orderToRow(o, userId)), { onConflict: 'id' });
  if (error) throw new Error(`Failed to save orders to Supabase: ${error.message}`);
}

// Permanently removes one order. The DB policy only allows this for the
// order's own owner and only while its status is 'cancelled' — a delete
// attempted on anything else is rejected there, not just here.
export async function deleteOrderRow(orderId: string) {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw new Error(`Failed to delete order from Supabase: ${error.message}`);
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
    // Real ordering is per-category (category_display_order) and applied
    // client-side wherever products are filtered down to one category — a
    // flat cross-category order-by can't reflect that. This just keeps the
    // base fetch stable/insertion-ordered.
    supabase.from('products').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
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

// Admin-only loyalty mutations (credit/reverse/redeem) — atomic single-row
// updates in the database, not a client-side recompute + bulk resync of the
// whole customers table, so two admin sessions crediting different orders
// at the same moment can never clobber each other's points. Each call
// passes an idempotencyKey unique to that one logical event (built once per
// invocation, reused across retries of the same event) so a retried network
// call can never double-apply — see the loyalty_ledger migration.
export async function creditOrderLoyaltyRpc(
  ownerId: string,
  orderId: string,
  customerName: string,
  customerPhone: string,
  points: number,
  idempotencyKey: string
): Promise<number> {
  const { data, error } = await supabase.rpc('credit_order_loyalty', {
    p_user_id: ownerId,
    p_order_id: orderId,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_points: points,
    p_idempotency_key: idempotencyKey
  });
  if (error) throw new Error(`Failed to credit loyalty points: ${error.message}`);
  return data as number;
}

export async function reverseOrderLoyaltyRpc(
  ownerId: string,
  orderId: string,
  customerPhone: string,
  points: number,
  idempotencyKey: string
): Promise<number> {
  const { data, error } = await supabase.rpc('reverse_order_loyalty', {
    p_user_id: ownerId,
    p_order_id: orderId,
    p_customer_phone: customerPhone,
    p_points: points,
    p_idempotency_key: idempotencyKey
  });
  if (error) throw new Error(`Failed to reverse loyalty points: ${error.message}`);
  return data as number;
}

// Throws with message 'insufficient_points' if the balance no longer covers
// the reward's cost at the moment the update actually runs (e.g. it was
// just redeemed by a concurrent request) — the caller shows that as a
// clean "not enough points" message rather than a generic failure.
export async function redeemLoyaltyRewardRpc(
  ownerId: string,
  customerPhone: string,
  pointsCost: number,
  rewardLabel: string,
  rewardValue: number,
  rewardType: string,
  idempotencyKey: string
): Promise<number> {
  const { data, error } = await supabase.rpc('redeem_loyalty_reward', {
    p_user_id: ownerId,
    p_customer_phone: customerPhone,
    p_points_cost: pointsCost,
    p_reward_label: rewardLabel,
    p_reward_value: rewardValue,
    p_reward_type: rewardType,
    p_idempotency_key: idempotencyKey
  });
  if (error) throw new Error(error.message.includes('insufficient_points') ? 'insufficient_points' : `Failed to redeem reward: ${error.message}`);
  return data as number;
}

// Financeiro: mirrors an order's revenue the moment it reaches 'delivered'
// (see updateOrderStatus in AppContext.tsx) — an atomic upsert keyed on
// (user_id, order_id), so retries/duplicate calls for the same order never
// create a second revenue row (see 20260910233526_financial_module.sql).
// Never overwrites a revenue the owner has manually edited/adopted.
export async function syncOrderRevenueRpc(
  ownerId: string,
  orderId: string,
  description: string,
  category: string,
  amount: number,
  paymentMethod: string,
  occurredAt: string
): Promise<string> {
  const { data, error } = await supabase.rpc('sync_order_revenue', {
    p_user_id: ownerId,
    p_order_id: orderId,
    p_description: description,
    p_category: category,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_occurred_at: occurredAt
  });
  if (error) throw new Error(`Failed to sync order revenue: ${error.message}`);
  return data as string;
}

// The inverse — removes the automatic revenue when an order is cancelled or
// reverted from 'delivered' to an earlier stage. No-op if the revenue was
// manually adopted by the owner (is_manual_override = true).
export async function removeOrderRevenueRpc(ownerId: string, orderId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_order_revenue', {
    p_user_id: ownerId,
    p_order_id: orderId
  });
  if (error) throw new Error(`Failed to remove order revenue: ${error.message}`);
}

export interface LoyaltyLedgerEntry {
  id: number;
  customerPhone: string;
  orderId: string | null;
  type: 'earn' | 'reversal' | 'redeem';
  pointsDelta: number;
  balanceBefore: number;
  balanceAfter: number;
  rewardSnapshot: { label: string; value: number; type: string } | null;
  createdAt: string;
}

export async function fetchLoyaltyLedger(ownerId: string, customerPhone: string): Promise<LoyaltyLedgerEntry[]> {
  const { data, error } = await supabase
    .from('loyalty_ledger')
    .select('*')
    .eq('user_id', ownerId)
    .eq('customer_phone', customerPhone)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load loyalty history: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    customerPhone: r.customer_phone,
    orderId: r.order_id,
    type: r.type,
    pointsDelta: r.points_delta,
    balanceBefore: r.balance_before,
    balanceAfter: r.balance_after,
    rewardSnapshot: r.reward_snapshot,
    createdAt: r.created_at
  }));
}

// DRE-only: total value of reward redemptions in a date range (across every
// customer), for the "Benefícios Fidelidade / Resgates de pontos" deduction
// line — separate from fetchLoyaltyLedger above, which is scoped to one
// customer for the Clientes & Fidelidade history panel.
export async function fetchLoyaltyRedemptionsTotal(ownerId: string, range: { start: string; end: string }): Promise<number> {
  const { data, error } = await supabase
    .from('loyalty_ledger')
    .select('reward_snapshot')
    .eq('user_id', ownerId)
    .eq('type', 'redeem')
    .gte('created_at', `${range.start}T00:00:00`)
    .lte('created_at', `${range.end}T23:59:59`);
  if (error) throw new Error(`Failed to load loyalty redemptions: ${error.message}`);
  return (data || []).reduce((sum: number, r: any) => sum + Number(r.reward_snapshot?.value ?? 0), 0);
}

// --- Módulo Financeiro ---
// Deliberately NOT part of fetchWorkspace/syncRows (unlike coupons/
// customers, which are small and always fully in memory): revenues and
// expenses accumulate indefinitely over an account's life, so each screen
// fetches only the period it's showing and writes one row at a time — same
// reasoning as fetchLoyaltyLedger just above, and why orders itself is
// append/update-only rather than full-list synced.

export interface DateRange { start: string; end: string }

const rowToRevenue = (r: any): Revenue => ({
  id: r.id,
  description: r.description,
  category: r.category,
  amount: Number(r.amount),
  occurredAt: r.occurred_at,
  paymentMethod: r.payment_method ?? undefined,
  origin: r.origin,
  orderId: r.order_id ?? undefined,
  isManualOverride: r.is_manual_override,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

export async function fetchRevenues(userId: string, range?: DateRange): Promise<Revenue[]> {
  let query = supabase.from('revenues').select('*').eq('user_id', userId);
  if (range) query = query.gte('occurred_at', range.start).lte('occurred_at', range.end);
  const { data, error } = await query.order('occurred_at', { ascending: false });
  if (error) throw new Error(`Failed to load revenues: ${error.message}`);
  return (data || []).map(rowToRevenue);
}

export async function createRevenue(userId: string, revenue: Omit<Revenue, 'id' | 'origin' | 'isManualOverride' | 'createdAt' | 'updatedAt'>): Promise<Revenue> {
  const { data, error } = await supabase
    .from('revenues')
    .insert({
      user_id: userId,
      description: revenue.description,
      category: revenue.category,
      amount: revenue.amount,
      occurred_at: revenue.occurredAt,
      payment_method: revenue.paymentMethod ?? null,
      origin: 'manual'
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create revenue: ${error.message}`);
  return rowToRevenue(data);
}

// Editing an automatic (pedido_automatico) revenue adopts it — future order
// status syncs (see sync_order_revenue) will then leave it alone instead of
// silently overwriting the owner's edit.
export async function updateRevenue(userId: string, id: string, patch: Partial<Pick<Revenue, 'description' | 'category' | 'amount' | 'occurredAt' | 'paymentMethod'>>, adopt: boolean): Promise<Revenue> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.occurredAt !== undefined) row.occurred_at = patch.occurredAt;
  if (patch.paymentMethod !== undefined) row.payment_method = patch.paymentMethod;
  if (adopt) row.is_manual_override = true;

  const { data, error } = await supabase.from('revenues').update(row).eq('id', id).eq('user_id', userId).select('*').single();
  if (error) throw new Error(`Failed to update revenue: ${error.message}`);
  return rowToRevenue(data);
}

export async function deleteRevenue(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('revenues').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Failed to delete revenue: ${error.message}`);
}

const rowToExpense = (r: any): Expense => ({
  id: r.id,
  description: r.description,
  category: r.category,
  amount: Number(r.amount),
  dueDate: r.due_date,
  paidDate: r.paid_date ?? undefined,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

export async function fetchExpenses(userId: string, range?: DateRange): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').eq('user_id', userId);
  if (range) query = query.gte('due_date', range.start).lte('due_date', range.end);
  const { data, error } = await query.order('due_date', { ascending: false });
  if (error) throw new Error(`Failed to load expenses: ${error.message}`);
  return (data || []).map(rowToExpense);
}

export async function createExpense(userId: string, expense: Pick<Expense, 'description' | 'category' | 'amount' | 'dueDate'>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      due_date: expense.dueDate
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create expense: ${error.message}`);
  return rowToExpense(data);
}

export async function updateExpense(userId: string, id: string, patch: Partial<Pick<Expense, 'description' | 'category' | 'amount' | 'dueDate'>>): Promise<Expense> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;

  const { data, error } = await supabase.from('expenses').update(row).eq('id', id).eq('user_id', userId).select('*').single();
  if (error) throw new Error(`Failed to update expense: ${error.message}`);
  return rowToExpense(data);
}

export async function markExpensePaid(userId: string, id: string, paidDate: string): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update({ status: 'pago', paid_date: paidDate, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to mark expense as paid: ${error.message}`);
  return rowToExpense(data);
}

// Reopens a paid expense back to pendente (e.g. marked paid by mistake).
export async function markExpenseUnpaid(userId: string, id: string): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update({ status: 'pendente', paid_date: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to reopen expense: ${error.message}`);
  return rowToExpense(data);
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Failed to delete expense: ${error.message}`);
}

const rowToCashAdjustment = (r: any): CashAdjustment => ({
  id: r.id,
  description: r.description,
  amount: Number(r.amount),
  occurredAt: r.occurred_at,
  createdAt: r.created_at
});

export async function fetchCashAdjustments(userId: string, range?: DateRange): Promise<CashAdjustment[]> {
  let query = supabase.from('cash_adjustments').select('*').eq('user_id', userId);
  if (range) query = query.gte('occurred_at', range.start).lte('occurred_at', range.end);
  const { data, error } = await query.order('occurred_at', { ascending: false });
  if (error) throw new Error(`Failed to load cash adjustments: ${error.message}`);
  return (data || []).map(rowToCashAdjustment);
}

export async function createCashAdjustment(userId: string, adjustment: Pick<CashAdjustment, 'description' | 'amount' | 'occurredAt'>): Promise<CashAdjustment> {
  const { data, error } = await supabase
    .from('cash_adjustments')
    .insert({ user_id: userId, description: adjustment.description, amount: adjustment.amount, occurred_at: adjustment.occurredAt })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create cash adjustment: ${error.message}`);
  return rowToCashAdjustment(data);
}

export async function deleteCashAdjustment(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('cash_adjustments').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Failed to delete cash adjustment: ${error.message}`);
}

export async function fetchFinancialTransactions(userId: string, range?: DateRange): Promise<FinancialTransaction[]> {
  let query = supabase.from('financial_transactions').select('*').eq('user_id', userId);
  if (range) query = query.gte('occurred_at', range.start).lte('occurred_at', range.end);
  const { data, error } = await query.order('occurred_at', { ascending: false }).order('id', { ascending: false });
  if (error) throw new Error(`Failed to load financial timeline: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    direction: r.direction,
    amount: Number(r.amount),
    source: r.source,
    sourceId: r.source_id,
    description: r.description,
    category: r.category ?? undefined,
    occurredAt: r.occurred_at,
    createdAt: r.created_at
  }));
}

export async function fetchCashFlowDaily(userId: string, range?: DateRange): Promise<CashFlowDay[]> {
  let query = supabase.from('cash_flow_daily').select('*').eq('user_id', userId);
  if (range) query = query.gte('occurred_at', range.start).lte('occurred_at', range.end);
  const { data, error } = await query.order('occurred_at', { ascending: true });
  if (error) throw new Error(`Failed to load cash flow: ${error.message}`);
  return (data || []).map((r: any) => ({
    occurredAt: r.occurred_at,
    inflow: Number(r.inflow),
    outflow: Number(r.outflow),
    net: Number(r.net)
  }));
}

const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  initialBalance: 0,
  initialBalanceDate: new Date().toISOString().slice(0, 10),
  cogsPercent: 35,
  updatedAt: new Date().toISOString()
};

export async function fetchFinanceSettings(userId: string): Promise<FinanceSettings> {
  const { data, error } = await supabase.from('finance_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Failed to load finance settings: ${error.message}`);
  if (!data) return DEFAULT_FINANCE_SETTINGS;
  return {
    initialBalance: Number(data.initial_balance),
    initialBalanceDate: data.initial_balance_date,
    cogsPercent: Number(data.cogs_percent),
    updatedAt: data.updated_at
  };
}

export async function saveFinanceSettings(userId: string, settings: Pick<FinanceSettings, 'initialBalance' | 'initialBalanceDate' | 'cogsPercent'>): Promise<void> {
  const { error } = await supabase.from('finance_settings').upsert({
    user_id: userId,
    initial_balance: settings.initialBalance,
    initial_balance_date: settings.initialBalanceDate,
    cogs_percent: settings.cogsPercent,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) throw new Error(`Failed to save finance settings: ${error.message}`);
}

export async function fetchDreReports(userId: string): Promise<DreReport[]> {
  const { data, error } = await supabase.from('dre_reports').select('*').eq('user_id', userId).order('period_start', { ascending: false });
  if (error) throw new Error(`Failed to load DRE history: ${error.message}`);
  return (data || []).map((r: any) => ({
    id: r.id,
    periodType: r.period_type,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    breakdown: r.breakdown as DreBreakdown,
    generatedAt: r.generated_at
  }));
}

// "Fechar período" — snapshots the live-computed DRE so it survives future
// edits to the underlying revenues/expenses without shifting retroactively.
export async function saveDreSnapshot(userId: string, periodType: DreReport['periodType'], periodStart: string, periodEnd: string, breakdown: DreBreakdown): Promise<void> {
  const { error } = await supabase.from('dre_reports').upsert({
    user_id: userId,
    period_type: periodType,
    period_start: periodStart,
    period_end: periodEnd,
    breakdown,
    generated_at: new Date().toISOString()
  }, { onConflict: 'user_id,period_type,period_start' });
  if (error) throw new Error(`Failed to save DRE snapshot: ${error.message}`);
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
