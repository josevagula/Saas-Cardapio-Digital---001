import { Order } from '../types';
import { FilterPreset, rangeForPreset } from './analyticsStats';
import { safeNumber } from './formatters';

// Shared by Pedidos and the Dashboard so "filter by date / product / person"
// means exactly the same thing on both screens.

export type OrderDatePreset = 'todos' | FilterPreset;

export interface OrderFilterState {
  datePreset: OrderDatePreset;
  customStart: string;
  customEnd: string;
  productId: string; // '' = all products
  customer: string;  // free-text: matches name or phone
}

export function defaultOrderFilters(datePreset: OrderDatePreset = 'todos'): OrderFilterState {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    datePreset,
    customStart: start.toISOString().slice(0, 10),
    customEnd: end.toISOString().slice(0, 10),
    productId: '',
    customer: ''
  };
}

export function hasActiveOrderFilters(f: OrderFilterState, baseline: OrderDatePreset = 'todos'): boolean {
  return f.datePreset !== baseline || f.productId !== '' || f.customer.trim() !== '';
}

const digitsOnly = (s: string) => s.replace(/\D/g, '');

const normalizeText = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function matchesCustomer(order: Order, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (normalizeText(order.customerName || '').includes(normalizeText(q))) return true;
  const qDigits = digitsOnly(q);
  return qDigits.length >= 3 && digitsOnly(order.customerPhone || '').includes(qDigits);
}

// Deliberately keeps cancelled orders — Pedidos has a "Cancelados" tab; the
// dashboard's own stats helpers already drop them.
export function applyOrderFilters(orders: Order[], f: OrderFilterState): Order[] {
  const range = f.datePreset === 'todos' ? null : rangeForPreset(f.datePreset, { start: f.customStart, end: f.customEnd });
  return orders.filter(o => {
    if (range) {
      const created = new Date(o.createdAt);
      if (created < range.start || created > range.end) return false;
    }
    if (f.productId && !o.items.some(item => item.product.id === f.productId)) return false;
    return matchesCustomer(o, f.customer);
  });
}

// Every product that appears in at least one order (deleted products
// included, under the name they were sold with), alphabetical.
export function productOptionsFromOrders(orders: Order[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  orders.forEach(o => o.items.forEach(item => {
    if (!byId.has(item.product.id)) byId.set(item.product.id, item.product.name);
  }));
  return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

// Distinct customers (by phone, falling back to name) for the search box's suggestions.
export function customerOptionsFromOrders(orders: Order[]): string[] {
  const seen = new Map<string, string>();
  orders.forEach(o => {
    const key = digitsOnly(o.customerPhone || '') || normalizeText(o.customerName || '');
    if (key && !seen.has(key)) seen.set(key, o.customerName);
  });
  return Array.from(new Set(seen.values())).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Units and line revenue of one product across the given orders (cancelled excluded).
export function productSalesInOrders(orders: Order[], productId: string): { units: number; revenue: number } {
  let units = 0;
  let revenue = 0;
  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    o.items.forEach(item => {
      if (item.product.id !== productId) return;
      units += item.quantity;
      revenue += safeNumber(item.product.promoPrice || item.product.price) * item.quantity
        + (item.extras || []).reduce((s, ex) => s + safeNumber(ex.price) * safeNumber(ex.quantity), 0);
    });
  });
  return { units, revenue: Math.round(revenue * 100) / 100 };
}
