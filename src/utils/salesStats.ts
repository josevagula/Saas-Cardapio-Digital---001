import { Order } from '../types';

// Single source of truth for "what really sold" — used by the dashboard and
// by the Sushy AI sales analysis alike, so neither one can drift from real
// orders (the account's own analytics_snapshot can go stale; orders can't).

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro'
};

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// Orders placed within [start, end], inclusive of both calendar days.
export function ordersInRange(orders: Order[], start: Date, end: Date): Order[] {
  const exclusiveEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  return orders.filter(o => {
    const created = new Date(o.createdAt);
    return created >= start && created < exclusiveEnd;
  });
}

export function sumOrdersRevenue(orders: Order[], start: Date, end: Date): number {
  return ordersInRange(orders, start, end).reduce((sum, o) => sum + o.total, 0);
}

// Real per-day revenue across [start, end], inclusive — for area/bar charts.
export function revenueHistoryByDay(orders: Order[], start: Date, end: Date): { date: string; amount: number }[] {
  const dayCount = Math.min(366, Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1));
  const days: { date: string; amount: number }[] = [];
  for (let i = 0; i < dayCount; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dayTotal = orders
      .filter(o => isSameDay(new Date(o.createdAt), current))
      .reduce((sum, o) => sum + o.total, 0);
    days.push({ date: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), amount: Math.round(dayTotal * 100) / 100 });
  }
  return days;
}

export interface RealSalesSummary {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  ticketAverage: number;
  weeklyHistory: { date: string; amount: number }[];
  monthlyHistory: { date: string; amount: number }[];
}

// The account's real revenue/order figures, computed straight from its
// orders — never from a separately-persisted snapshot that can go stale.
export function computeRealSalesSummary(orders: Order[]): RealSalesSummary {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const dailyRevenue = Math.round(sumOrdersRevenue(orders, today, today) * 100) / 100;
  const weeklyRevenue = Math.round(sumOrdersRevenue(orders, weekStart, today) * 100) / 100;
  const monthlyRevenue = Math.round(sumOrdersRevenue(orders, monthStart, today) * 100) / 100;
  const totalOrders = orders.length;
  const totalRevenueAllTime = orders.reduce((sum, o) => sum + o.total, 0);
  const ticketAverage = totalOrders > 0 ? Math.round((totalRevenueAllTime / totalOrders) * 100) / 100 : 0;

  return {
    dailyRevenue,
    weeklyRevenue,
    monthlyRevenue,
    totalOrders,
    ticketAverage,
    weeklyHistory: revenueHistoryByDay(orders, weekStart, today),
    monthlyHistory: revenueHistoryByDay(orders, monthStart, today)
  };
}

// Real units sold per product id, counted straight from every order's line
// items — deliberately ignores each product's own salesCount counter, which
// can drift (see createOrder's publicMenuOwnerId branch).
export function computeRealUnitsSoldByProductId(orders: Order[]): Record<string, number> {
  const counts: Record<string, number> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      counts[item.product.id] = (counts[item.product.id] || 0) + item.quantity;
    });
  });
  return counts;
}
