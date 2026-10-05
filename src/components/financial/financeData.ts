import { Order, Revenue, RevenueCategory } from '../../types';
import { fetchRevenues, fetchOverriddenRevenueOrderIds, fetchFinancialTransactions, DateRange } from '../../lib/workspaceRepo';
import { localISO } from './financeShared';
import { formatOrderCode } from '../../utils/formatters';

// Order revenue is DERIVED from the real orders (delivered = money actually
// collected), never read from the automatic rows in `revenues`: those were
// only written at the moment staff clicked "Entregue", dated by the UTC clock
// (late-night sales landed on the next day) and missing for orders delivered
// any other way. Deriving it means Financeiro always matches Pedidos. Only
// manual revenues and order revenues the owner edited (is_manual_override)
// are read from the database.

const revenueCategoryForOrder = (order: Order): RevenueCategory =>
  order.deliveryMethod === 'delivery' ? 'delivery' : order.deliveryMethod === 'dine_in' ? 'salao' : 'balcao';

// The day the sale happened, in the restaurant's local time.
export const orderLocalDate = (order: Order): string => localISO(new Date(order.createdAt));

export function orderToRevenue(order: Order): Revenue {
  return {
    id: `order:${order.id}`,
    description: `Pedido ${formatOrderCode(order)}`,
    category: revenueCategoryForOrder(order),
    amount: order.total,
    occurredAt: orderLocalDate(order),
    paymentMethod: order.paymentMethod,
    origin: 'pedido_automatico',
    orderId: order.id,
    isManualOverride: false,
    createdAt: order.createdAt,
    updatedAt: order.createdAt
  };
}

const inRange = (iso: string, range?: DateRange) => !range || (iso >= range.start && iso <= range.end);

export async function loadRevenues(userId: string, orders: Order[], range?: DateRange): Promise<Revenue[]> {
  const [stored, overriddenIds] = await Promise.all([
    fetchRevenues(userId, range, { storedOnly: true }),
    fetchOverriddenRevenueOrderIds(userId)
  ]);
  const derived = orders
    .filter(o => o.status === 'delivered' && !overriddenIds.has(o.id))
    .map(orderToRevenue)
    .filter(r => inRange(r.occurredAt, range));
  return [...stored, ...derived].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export interface CashMovement {
  key: string;
  direction: 'in' | 'out';
  amount: number;
  description: string;
  occurredAt: string;
}

// Every cash movement: revenues (derived + stored) in, paid expenses out,
// manual adjustments either way.
export async function loadCashMovements(userId: string, orders: Order[], range?: DateRange): Promise<CashMovement[]> {
  const [revenues, transactions] = await Promise.all([
    loadRevenues(userId, orders, range),
    fetchFinancialTransactions(userId, range, ['expense', 'adjustment'])
  ]);
  return [
    ...revenues.map(r => ({ key: `r:${r.id}`, direction: 'in' as const, amount: r.amount, description: r.description, occurredAt: r.occurredAt })),
    ...transactions.map(t => ({ key: `t:${t.id}`, direction: t.direction, amount: t.amount, description: t.description, occurredAt: t.occurredAt }))
  ].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export const netOf = (m: CashMovement) => (m.direction === 'in' ? m.amount : -m.amount);

export function dailyTotals(movements: CashMovement[]): { occurredAt: string; inflow: number; outflow: number; net: number }[] {
  const map = new Map<string, { inflow: number; outflow: number }>();
  movements.forEach(m => {
    const d = map.get(m.occurredAt) ?? { inflow: 0, outflow: 0 };
    if (m.direction === 'in') d.inflow += m.amount; else d.outflow += m.amount;
    map.set(m.occurredAt, d);
  });
  return Array.from(map, ([occurredAt, d]) => ({ occurredAt, ...d, net: d.inflow - d.outflow }))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}
