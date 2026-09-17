import { Order } from '../types';

// Read-only calculation layer for the Analytics Avançado module — every
// function here only ever derives numbers from the account's own `orders`
// (never writes to it), the same "never trust a separately-persisted
// snapshot" rule as computeRealSalesSummary in salesStats.ts. Only orders
// that reached "Concluídos" (status 'delivered') count here — pending,
// preparing, dispatched and cancelled orders are all excluded, since an
// order that hasn't actually been delivered isn't a real sale yet.

const DAY_MS = 24 * 60 * 60 * 1000;

export function isActiveOrder(o: Order): boolean {
  return o.status === 'delivered';
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export interface DateRange {
  start: Date;
  end: Date;
}

// --- Global filter presets (Hoje, Ontem, 7 dias, 30 dias, 90 dias, Este
// mês, Mês passado, Este ano, Personalizado) — drives every card and chart
// on the page (Ticket Médio, Recompra, Ativos/Inativos, LTV, VIP, gráficos). ---
export type FilterPreset =
  | 'hoje' | 'ontem' | '7d' | '30d' | '90d'
  | 'este_mes' | 'mes_passado' | 'este_ano' | 'personalizado';

export const FILTER_PRESETS: { id: FilterPreset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'este_ano', label: 'Este ano' },
  { id: 'personalizado', label: 'Personalizado' }
];

export function rangeForPreset(preset: FilterPreset, custom?: { start: string; end: string }): DateRange {
  const now = new Date();
  const today = startOfDay(now);
  switch (preset) {
    case 'hoje':
      return { start: today, end: endOfDay(now) };
    case 'ontem': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y, end: endOfDay(y) };
    }
    case '7d': {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: s, end: endOfDay(now) };
    }
    case '30d': {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: s, end: endOfDay(now) };
    }
    case '90d': {
      const s = new Date(today);
      s.setDate(s.getDate() - 89);
      return { start: s, end: endOfDay(now) };
    }
    case 'este_mes':
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: endOfDay(now) };
    case 'mes_passado': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'este_ano':
      return { start: new Date(today.getFullYear(), 0, 1), end: endOfDay(now) };
    case 'personalizado':
      if (!custom || !custom.start || !custom.end) return { start: today, end: endOfDay(now) };
      return { start: startOfDay(new Date(custom.start + 'T00:00:00')), end: endOfDay(new Date(custom.end + 'T00:00:00')) };
  }
}

function previousEquivalentRange(range: DateRange): DateRange {
  const lengthMs = range.end.getTime() - range.start.getTime();
  const prevEnd = new Date(range.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return { start: prevStart, end: prevEnd };
}

function lastNDaysRange(n: number, ref = new Date()): DateRange {
  const today = startOfDay(ref);
  const start = new Date(today);
  start.setDate(start.getDate() - (n - 1));
  return { start, end: endOfDay(ref) };
}

function ordersBetween(orders: Order[], range: DateRange): Order[] {
  return orders.filter(o => {
    if (!isActiveOrder(o)) return false;
    const created = new Date(o.createdAt);
    return created >= range.start && created <= range.end;
  });
}

// --- 1. Ticket Médio ---

function ticketMedio(orders: Order[]): number {
  const active = orders.filter(isActiveOrder);
  if (active.length === 0) return 0;
  return active.reduce((s, o) => s + o.total, 0) / active.length;
}

export interface PeriodStat {
  key: string;
  label: string;
  value: number;
  changePercent: number | null;
}

// Ticket médio for the selected global period, compared against the
// immediately preceding period of the same length — this is what makes the
// Ticket Médio card move with the Hoje/Ontem/7 dias/... filter.
export function computeTicketMedioForRange(orders: Order[], range: DateRange): PeriodStat {
  const prevRange = previousEquivalentRange(range);
  const current = ticketMedio(ordersBetween(orders, range));
  const previous = ticketMedio(ordersBetween(orders, prevRange));
  const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return {
    key: 'periodo',
    label: 'Ticket Médio',
    value: Math.round(current * 100) / 100,
    changePercent: changePercent !== null ? Math.round(changePercent * 10) / 10 : null
  };
}

// --- 2. Taxa de Recompra ---

function recompraRate(orders: Order[], range: DateRange): number {
  const inRange = ordersBetween(orders, range);
  const countByPhone: Record<string, number> = {};
  inRange.forEach(o => { countByPhone[o.customerPhone] = (countByPhone[o.customerPhone] || 0) + 1; });
  const totalClientes = Object.keys(countByPhone).length;
  if (totalClientes === 0) return 0;
  const recompradores = Object.values(countByPhone).filter(c => c > 1).length;
  return (recompradores / totalClientes) * 100;
}

// Same idea as computeTicketMedioForRange, for Taxa de Recompra.
export function computeRecompraForRange(orders: Order[], range: DateRange): PeriodStat {
  const prevRange = previousEquivalentRange(range);
  const current = recompraRate(orders, range);
  const previous = recompraRate(orders, prevRange);
  const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return {
    key: 'periodo',
    label: 'Taxa de Recompra',
    value: Math.round(current * 10) / 10,
    changePercent: changePercent !== null ? Math.round(changePercent * 10) / 10 : null
  };
}

export function recompraHistory(orders: Order[], months = 6): { date: string; rate: number }[] {
  const now = new Date();
  const result: { date: string; rate: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, now.getDate());
    const rate = recompraRate(orders, lastNDaysRange(30, ref));
    result.push({ date: ref.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), rate: Math.round(rate * 10) / 10 });
  }
  return result;
}

// --- Shared per-customer aggregate (used by Ativos/Inativos/LTV/VIP) ---

export interface CustomerAggregate {
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
}

export function aggregateCustomers(orders: Order[]): CustomerAggregate[] {
  const map = new Map<string, CustomerAggregate>();
  orders.filter(isActiveOrder).forEach(o => {
    const created = new Date(o.createdAt);
    const existing = map.get(o.customerPhone);
    if (!existing) {
      map.set(o.customerPhone, { phone: o.customerPhone, name: o.customerName, orderCount: 1, totalSpent: o.total, firstOrderAt: created, lastOrderAt: created });
      return;
    }
    existing.orderCount += 1;
    existing.totalSpent += o.total;
    if (created < existing.firstOrderAt) existing.firstOrderAt = created;
    if (created > existing.lastOrderAt) {
      existing.lastOrderAt = created;
      existing.name = o.customerName;
    }
  });
  return Array.from(map.values());
}

function monthsSpan(c: CustomerAggregate): number {
  return Math.max(1, (c.lastOrderAt.getTime() - c.firstOrderAt.getTime()) / (30 * DAY_MS));
}

// --- 3. Clientes Ativos (>=1 pedido dentro do período selecionado) ---

export interface ClientesAtivosResult {
  total: number;
  crescimento: number | null;
  novos: number;
  rows: CustomerAggregate[];
}

export function computeClientesAtivos(orders: Order[], range: DateRange): ClientesAtivosResult {
  // All-time aggregates as of the period's end date, so firstOrderAt/lastOrderAt
  // reflect real history — "novos" below needs the customer's true first order,
  // not just their first order inside this slice.
  const upToEnd = orders.filter(o => new Date(o.createdAt) <= range.end);
  const allCustomers = aggregateCustomers(upToEnd);
  const inRangePhones = new Set(aggregateCustomers(ordersBetween(orders, range)).map(c => c.phone));
  const ativos = allCustomers.filter(c => inRangePhones.has(c.phone));

  const prevRange = previousEquivalentRange(range);
  const prevPhones = new Set(aggregateCustomers(ordersBetween(orders, prevRange)).map(c => c.phone));
  const crescimento = prevPhones.size > 0
    ? ((ativos.length - prevPhones.size) / prevPhones.size) * 100
    : null;
  const novos = ativos.filter(c => c.firstOrderAt >= range.start && c.firstOrderAt <= range.end).length;

  return {
    total: ativos.length,
    crescimento: crescimento !== null ? Math.round(crescimento * 10) / 10 : null,
    novos,
    rows: ativos.sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime())
  };
}

// --- 4. Clientes Inativos ---

export type InactivityTier = 'Leve' | 'Médio' | 'Grave';

export interface InactiveCustomerRow extends CustomerAggregate {
  daysSince: number;
  tier: InactivityTier;
}

// "Sem pedido há 31+ dias" measured from the selected period's end date —
// for the default "hoje"-ending presets that's just now; for a past range
// (Ontem, Mês passado, Personalizado) it shows who was already inactive as
// of that date.
export function computeClientesInativos(orders: Order[], range: DateRange): InactiveCustomerRow[] {
  const upToEnd = orders.filter(o => new Date(o.createdAt) <= range.end);
  const all = aggregateCustomers(upToEnd);
  const cutoff = new Date(range.end);
  cutoff.setDate(cutoff.getDate() - 30);

  return all
    .filter(c => c.lastOrderAt < cutoff)
    .map(c => {
      const daysSince = Math.floor((range.end.getTime() - c.lastOrderAt.getTime()) / DAY_MS);
      const tier: InactivityTier = daysSince <= 60 ? 'Leve' : daysSince <= 120 ? 'Médio' : 'Grave';
      return { ...c, daysSince, tier };
    })
    .sort((a, b) => b.daysSince - a.daysSince);
}

// --- 5. Lifetime Value ---
// LTV = Ticket Médio do cliente × Frequência de Compra × Tempo Médio de
// Relacionamento. Frequência e tempo médio são médias da base inteira
// (cohort) — só o ticket médio varia por cliente — para que o LTV projete
// valor futuro esperado em vez de reproduzir o total já gasto (o que
// aconteceria se cada cliente usasse sua própria frequência × seu próprio
// tempo de relacionamento, pois esse produto sempre equivale ao nº de
// pedidos dele).

export interface LtvCustomerRow {
  phone: string;
  name: string;
  ltv: number;
  avgOrderValue: number;
  orderCount: number;
  totalSpent: number;
}

export interface LtvResult {
  avgLtv: number;
  top: LtvCustomerRow[];
  history: { date: string; avgLtv: number }[];
}

function cohortLtvAverage(customers: CustomerAggregate[]): { avgLtv: number; rows: LtvCustomerRow[] } {
  if (customers.length === 0) return { avgLtv: 0, rows: [] };
  const avgFrequency = customers.reduce((s, c) => s + c.orderCount / monthsSpan(c), 0) / customers.length;
  const avgLifespanMonths = customers.reduce((s, c) => s + monthsSpan(c), 0) / customers.length;

  const rows: LtvCustomerRow[] = customers.map(c => {
    const avgOrderValue = c.totalSpent / c.orderCount;
    const ltv = avgOrderValue * avgFrequency * avgLifespanMonths;
    return {
      phone: c.phone,
      name: c.name,
      ltv: Math.round(ltv * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      orderCount: c.orderCount,
      totalSpent: Math.round(c.totalSpent * 100) / 100
    };
  }).sort((a, b) => b.ltv - a.ltv);

  const avgLtv = rows.reduce((s, r) => s + r.ltv, 0) / rows.length;
  return { avgLtv: Math.round(avgLtv * 100) / 100, rows };
}

// avgLtv/top are scoped to customers active within the selected period
// (cohort projection based on their behavior in that window); the trend
// line below stays a straight 6-month lookback regardless of the filter —
// it's a long-run context chart, not itself a period stat.
export function computeLtv(orders: Order[], range: DateRange, monthsHistory = 6): LtvResult {
  const cohort = aggregateCustomers(ordersBetween(orders, range));
  const { avgLtv, rows } = cohortLtvAverage(cohort);

  const now = new Date();
  const history: { date: string; avgLtv: number }[] = [];
  for (let i = monthsHistory - 1; i >= 0; i--) {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const ordersUpTo = orders.filter(o => isActiveOrder(o) && new Date(o.createdAt) <= monthEnd);
    const cohort = aggregateCustomers(ordersUpTo);
    const { avgLtv: monthAvg } = cohortLtvAverage(cohort);
    history.push({ date: monthEnd.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), avgLtv: monthAvg });
  }

  return { avgLtv, top: rows.slice(0, 10), history };
}

// --- 6. Ranking VIP ---

export type VipTierComputed = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';

export interface VipRow {
  position: number;
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  points: number;
  frequency: number;
  score: number;
  tier: VipTierComputed;
}

function minMax(values: number[]): { min: number; max: number } {
  return { min: Math.min(...values), max: Math.max(...values) };
}

function normalize(value: number, range: { min: number; max: number }): number {
  if (range.max <= range.min) return range.max > 0 ? 100 : 0;
  return ((value - range.min) / (range.max - range.min)) * 100;
}

export function computeVipRanking(orders: Order[], range: DateRange, pointsByPhone: Record<string, number>): VipRow[] {
  const all = aggregateCustomers(ordersBetween(orders, range));
  if (all.length === 0) return [];

  const withMetrics = all.map(c => ({
    ...c,
    frequency: c.orderCount / monthsSpan(c),
    points: pointsByPhone[c.phone] ?? 0
  }));

  const gastoRange = minMax(withMetrics.map(c => c.totalSpent));
  const pedidosRange = minMax(withMetrics.map(c => c.orderCount));
  const freqRange = minMax(withMetrics.map(c => c.frequency));
  const pontosRange = minMax(withMetrics.map(c => c.points));

  const scored = withMetrics.map(c => {
    const score =
      normalize(c.totalSpent, gastoRange) * 0.40 +
      normalize(c.orderCount, pedidosRange) * 0.25 +
      normalize(c.frequency, freqRange) * 0.20 +
      normalize(c.points, pontosRange) * 0.15;
    const tier: VipTierComputed = score >= 85 ? 'Diamante' : score >= 65 ? 'Ouro' : score >= 40 ? 'Prata' : 'Bronze';
    return {
      phone: c.phone,
      name: c.name,
      orderCount: c.orderCount,
      totalSpent: Math.round(c.totalSpent * 100) / 100,
      points: c.points,
      frequency: Math.round(c.frequency * 100) / 100,
      score: Math.round(score * 10) / 10,
      tier
    };
  }).sort((a, b) => b.score - a.score);

  return scored.map((r, idx) => ({ ...r, position: idx + 1 }));
}

// --- Global-filter-driven history chart (bottom of the page) ---

export interface DailyHistoryPoint {
  date: string;
  revenue: number;
  orders: number;
  ticket: number;
}

export function historyForRange(orders: Order[], range: DateRange): DailyHistoryPoint[] {
  const dayCount = Math.min(400, Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS) + 1));
  const days: DailyHistoryPoint[] = [];
  for (let i = 0; i < dayCount; i++) {
    const day = new Date(range.start);
    day.setDate(range.start.getDate() + i);
    const dayOrders = orders.filter(o => isActiveOrder(o) && sameDay(new Date(o.createdAt), day));
    const revenue = dayOrders.reduce((s, o) => s + o.total, 0);
    days.push({
      date: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      revenue: Math.round(revenue * 100) / 100,
      orders: dayOrders.length,
      ticket: dayOrders.length ? Math.round((revenue / dayOrders.length) * 100) / 100 : 0
    });
  }
  return days;
}
