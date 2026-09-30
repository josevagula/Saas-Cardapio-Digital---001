import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import OrderFiltersBar from './OrderFiltersBar';
import { applyOrderFilters, customerOptionsFromOrders, defaultOrderFilters, hasActiveOrderFilters, OrderFilterState, productOptionsFromOrders, productSalesInOrders } from '../utils/orderFilters';
import { computeRealSalesSummary, computeRealUnitsSoldByProductId, ordersInRange, revenueHistoryByDay, PAYMENT_METHOD_LABELS } from '../utils/salesStats';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Users,
  Flame,
  AlertTriangle,
  FileDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Local-time YYYY-MM-DD (matches <input type="date">); toISOString would
// shift late-evening orders onto the next day in UTC.
const toDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fromDayKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function DashboardOverview() {
  const { products, orders: allOrders, visualConfig, isDemoMode } = useApp();

  // Product/person filter — everything below (KPIs, chart, payment split,
  // leaderboards) is computed from the filtered orders. The date side is
  // handled by the existing Semanal/Mensal/Personalizado selector.
  const [filters, setFilters] = useState<OrderFilterState>(() => defaultOrderFilters());
  const filtersActive = hasActiveOrderFilters(filters);
  const productOptions = useMemo(() => productOptionsFromOrders(allOrders), [allOrders]);
  const customerOptions = useMemo(() => customerOptionsFromOrders(allOrders), [allOrders]);
  const orders = useMemo(() => applyOrderFilters(allOrders, filters), [allOrders, filters]);

  // Chart view state and custom date ranges
  const [chartView, setChartView] = useState<'semanal' | 'mensal' | 'personalizado'>('semanal');
  // The demo's mock orders are rebased (see rebaseDemoOrders in AppContext)
  // to spread across the last 30 days — default the custom range to that
  // same 30-day window, instead of the fixed placeholder window real
  // accounts start with, so Personalizado shows a distinct (wider) total
  // than Semanal/Mensal instead of covering the same handful of orders.
  const [startDate, setStartDate] = useState(() => {
    if (!isDemoMode) return '2026-07-01';
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    if (!isDemoMode) return '2026-07-07';
    return new Date().toISOString().slice(0, 10);
  });

  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Today's date, re-checked periodically so a dashboard left open across a
  // day/month rollover (no new order needed to trigger it) still rolls
  // Receita Mensal/Semanal/Diária over into the new month instead of
  // freezing on whatever day the page happened to load.
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const checkDate = () => {
      const current = new Date().toDateString();
      setTodayKey(prev => (prev === current ? prev : current));
    };
    const interval = setInterval(checkDate, 60 * 1000);
    document.addEventListener('visibilitychange', checkDate);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', checkDate);
    };
  }, []);

  // Real revenue/order figures derived directly from this account's actual
  // orders — never from the (separately-persisted, easily stale) analytics
  // snapshot — so the dashboard only ever counts what was really sold. Shared
  // with the Sushy AI sales analysis (see AppContext's analyzeAISales) so
  // both always agree on what "real" means. Monthly figures are always
  // scoped to the 1st of the current calendar month, so they start over on
  // their own as soon as a new month begins — no separate reset needed.
  const realStats = useMemo(() => computeRealSalesSummary(orders), [orders, todayKey]);

  // Real orders placed within the currently selected period (same window as
  // the revenue chart below) — drives both the "Total de Pedidos" KPI and the
  // payment-method split further down, instead of a lifetime order count or
  // a fixed mock split.
  const getPeriodOrders = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (chartView === 'semanal') {
      const periodStart = new Date(today);
      periodStart.setDate(today.getDate() - 6);
      return ordersInRange(orders, periodStart, today);
    }
    if (chartView === 'mensal') {
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return ordersInRange(orders, periodStart, today);
    }
    return ordersInRange(orders, new Date(startDate), new Date(endDate));
  };
  const periodOrders = getPeriodOrders();

  const selectedProductName = productOptions.find(p => p.id === filters.productId)?.name;
  const selectedProductSales = filters.productId ? productSalesInOrders(periodOrders, filters.productId) : null;

  // Chart totals: always computed from real orders (the demo's own rebased
  // mock orders included) so they agree with the day summary cards below.
  const kpi = { weeklyRevenue: realStats.weeklyRevenue, monthlyRevenue: realStats.monthlyRevenue };

  // Day summary (Faturado / Total de Pedidos / Ticket Médio) — all three are
  // computed from the same set of non-cancelled orders placed on one chosen
  // day, so ticket médio is always exactly faturado ÷ pedidos. null = "hoje",
  // which keeps following the real date across a midnight rollover.
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const todayDayKey = toDayKey(new Date());
  const dayKey = selectedDayKey && selectedDayKey < todayDayKey ? selectedDayKey : todayDayKey;
  const isToday = dayKey === todayDayKey;
  const selectedDay = fromDayKey(dayKey);
  const shiftDay = (delta: number) => {
    const d = fromDayKey(dayKey);
    d.setDate(d.getDate() + delta);
    const next = toDayKey(d);
    setSelectedDayKey(next >= todayDayKey ? null : next);
  };

  const daySummary = useMemo(() => {
    const summarize = (day: Date) => {
      const dayOrders = ordersInRange(orders, day, day);
      const revenue = Math.round(dayOrders.reduce((s, o) => s + o.total, 0) * 100) / 100;
      return { revenue, count: dayOrders.length, ticket: dayOrders.length > 0 ? Math.round((revenue / dayOrders.length) * 100) / 100 : 0 };
    };
    const current = summarize(selectedDay);
    const prevDay = new Date(selectedDay);
    prevDay.setDate(prevDay.getDate() - 1);
    const previous = summarize(prevDay);
    const cancelled = orders.filter(o => o.status === 'cancelled' && toDayKey(new Date(o.createdAt)) === dayKey).length;
    // Receita do mês of the chosen day: the whole month for a past month,
    // the 1st up to today for the current one.
    const monthStart = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1);
    const monthEnd = new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 0);
    const monthRevenue = Math.round(ordersInRange(orders, monthStart, monthEnd).reduce((s, o) => s + o.total, 0) * 100) / 100;
    return { ...current, previous, cancelled, monthRevenue };
  }, [orders, dayKey, todayKey]);

  const dayLabel = isToday
    ? 'Hoje'
    : dayKey === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return toDayKey(y); })()
      ? 'Ontem'
      : selectedDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dayLongLabel = selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const monthLabel = selectedDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const compareLabel = (current: number, previous: number) => {
    if (previous <= 0) return current > 0 ? 'Sem vendas no dia anterior' : null;
    const pct = Math.round(((current - previous) / previous) * 1000) / 10;
    return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toLocaleString('pt-BR')}% vs dia anterior`;
  };
  const revenueCompare = compareLabel(daySummary.revenue, daySummary.previous.revenue);

  // Determine active chart data and total based on the selected view —
  // always real orders, demo included (see kpi above).
  let displayedChartData: { date: string; amount: number }[] = [];
  let displayedTotal = 0;

  if (chartView === 'semanal') {
    displayedChartData = realStats.weeklyHistory;
    displayedTotal = kpi.weeklyRevenue;
  } else if (chartView === 'mensal') {
    displayedChartData = realStats.monthlyHistory;
    displayedTotal = kpi.monthlyRevenue;
  } else {
    // Custom date range: real orders placed within the selected window.
    const days = revenueHistoryByDay(orders, new Date(startDate), new Date(endDate));
    displayedChartData = days;
    displayedTotal = Math.round(days.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  }

  // Only ever built from orders that were actually placed and paid — a
  // payment method with zero real orders in the period simply doesn't
  // appear, instead of a fixed 4-way mock split.
  const paymentDistribution = (() => {
    const totals: Record<string, number> = {};
    periodOrders.forEach(o => {
      // Credit and debit card are merged into a single "Cartão" slice —
      // the split by card type isn't useful here, only card vs. other methods.
      const method = o.paymentMethod === 'credit_card' || o.paymentMethod === 'debit_card' ? 'card' : o.paymentMethod;
      totals[method] = (totals[method] || 0) + o.total;
    });
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    if (sum <= 0) return [];
    return Object.entries(totals).map(([method, amount]) => ({
      name: method === 'card' ? 'Cartão' : (PAYMENT_METHOD_LABELS[method] || method),
      value: Math.round((amount / sum) * 100)
    }));
  })();

  // Real units sold per product, counted straight from every order's line
  // items — the product record's own salesCount can drift (e.g. a customer
  // testing checkout on the owner's own public menu link in a logged-in
  // browser used to double-count it; fixed above, but this sidesteps that
  // counter entirely and is always exactly what was ordered).
  const realUnitsSoldByProductId = useMemo(() => computeRealUnitsSoldByProductId(orders), [orders]);
  const unitsSoldFor = (p: Product) => isDemoMode && !filtersActive ? p.salesCount : (realUnitsSoldByProductId[p.id] || 0);

  // Track initial load & date filter changes to trigger chart rise animation
  const [animKey, setAnimKey] = useState<number>(0);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);
  const prevFiltersRef = React.useRef<{ chartView: string; startDate: string; endDate: string } | null>(null);

  useEffect(() => {
    const fromPlans = sessionStorage.getItem('just_entered_from_plans');
    const isInitialSiteLoad = !sessionStorage.getItem('dashboard_initial_loaded');

    if (fromPlans === 'true') {
      sessionStorage.removeItem('just_entered_from_plans');
      sessionStorage.setItem('dashboard_initial_loaded', 'true');
      setShouldAnimate(true);
      setAnimKey(prev => prev + 1);
    } else if (isInitialSiteLoad) {
      // First time entering Dashboard on initial site load
      sessionStorage.setItem('dashboard_initial_loaded', 'true');
      setShouldAnimate(true);
      setAnimKey(prev => prev + 1);
    } else if (prevFiltersRef.current !== null) {
      const filtersChanged = 
        prevFiltersRef.current.chartView !== chartView ||
        prevFiltersRef.current.startDate !== startDate ||
        prevFiltersRef.current.endDate !== endDate;

      if (filtersChanged) {
        setShouldAnimate(true);
        setAnimKey(prev => prev + 1);
      } else {
        setShouldAnimate(false);
      }
    } else {
      // Switching tabs inside app during same session (e.g. Pedidos -> Dashboard): do not re-animate
      setShouldAnimate(false);
    }

    prevFiltersRef.current = { chartView, startDate, endDate };
  }, [chartView, startDate, endDate]);

  const maxAmount = Math.max(...displayedChartData.map(d => d.amount), 100);
  const yAxisMax = Math.ceil((maxAmount * 1.15) / 100) * 100;

  // Colors for charts (Orange gradient palette: #F97316, #EA580C, #FB923C, #F59E0B)
  const COLORS = ['#F97316', '#EA580C', '#FB923C', '#F59E0B'];

  // Identify Top and Bottom performing items for UI display
  const sortedProducts = [...products].sort((a, b) => unitsSoldFor(b) - unitsSoldFor(a));
  const topProducts = sortedProducts.slice(0, 3);
  const lowProducts = sortedProducts.filter(p => p.isAvailable).slice(-3).reverse();

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-3.5 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-dashboard-overview">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
        <div>
          <h2 className="text-lg sm:text-2xl font-display font-extrabold text-[#F5F0EA] tracking-tight">
            Painel Administrativo
          </h2>
          <p className="text-[11px] sm:text-xs text-[#A8A29A] mt-1">Acompanhe as métricas e o crescimento do seu delivery em tempo real.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 bg-[#141210] text-slate-200 text-xs font-semibold rounded-xl border border-[#2A211A] hover:bg-[#181512] hover:border-[#3A2E24] transition-all shadow-xs cursor-pointer w-full sm:w-auto"
          >
            <FileDown className="w-3.5 h-3.5 text-[#A8A29A]" />
            <span>Exportar Relatório</span>
          </button>

        </div>
      </div>

      {/* Filters — order-0 on mobile so they stay above everything they affect */}
      <div className="order-0 md:order-none mb-5 sm:mb-8 space-y-3">
        <OrderFiltersBar
          value={filters}
          onChange={setFilters}
          productOptions={productOptions}
          customerOptions={customerOptions}
          showDate={false}
          resultCount={orders.filter(o => o.status !== 'cancelled').length}
        />
        {selectedProductSales && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1F1209] px-3.5 py-2.5 rounded-lg border border-[#4A2A10] text-xs">
            <span className="text-slate-300 font-medium">
              <span className="text-[#F5F0EA] font-bold">{selectedProductName}</span>
              {' '}· {chartView === 'semanal' ? '7 dias' : chartView === 'mensal' ? 'mês corrente' : 'período selecionado'}
            </span>
            <span className="font-mono text-[#A8A29A]">
              <span className="text-[#F5F0EA] font-bold">{selectedProductSales.units} un.</span>
              {' '}vendidas ·{' '}
              <span className="text-[#FB923C] font-black">{formatCurrency(selectedProductSales.revenue)}</span>
              {' '}em vendas do produto
            </span>
          </div>
        )}
        {filtersActive && (
          <p className="text-[10px] text-[#A8A29A]">
            Os números abaixo consideram apenas os pedidos que correspondem aos filtros{filters.productId ? ' (pedidos que contêm o produto — valor total do pedido)' : ''}.
          </p>
        )}
      </div>

      {/* Day summary — order-1 on mobile so it takes the top slot above the chart; back to document order from md up */}
      <div className="order-1 md:order-none mb-5 sm:mb-8">
        {/* Day picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest">Resumo do dia</span>
            <p className="text-sm font-display font-bold text-[#F5F0EA] first-letter:uppercase truncate">{dayLongLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => shiftDay(-1)}
              className="p-2 rounded-lg bg-[#141210] text-slate-300 border border-[#2A211A] hover:bg-[#2A211A] hover:text-white transition-colors cursor-pointer"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141210] border border-[#2A211A] rounded-lg focus-within:border-[#FB923C] flex-1 sm:flex-none">
              <CalendarDays className="w-3.5 h-3.5 text-[#FB923C] shrink-0" />
              <input
                type="date"
                value={dayKey}
                max={todayDayKey}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setSelectedDayKey(v >= todayDayKey ? null : v);
                }}
                style={{ colorScheme: 'dark' }}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer w-full"
                aria-label="Escolher dia"
              />
            </label>
            <button
              onClick={() => shiftDay(1)}
              disabled={isToday}
              className="p-2 rounded-lg bg-[#141210] text-slate-300 border border-[#2A211A] hover:bg-[#2A211A] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDayKey(null)}
              disabled={isToday}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:cursor-default bg-[#1F1209] text-[#F97316] border-[#4A2A10] hover:bg-[#2A180C] disabled:bg-gradient-to-r disabled:from-[#C2410C] disabled:to-[#F97316] disabled:text-white disabled:border-[#F97316]"
            >
              Hoje
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Revenue on the selected day */}
          <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Faturado · {dayLabel}</span>
              <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
              {formatCurrency(daySummary.revenue)}
            </h3>
            <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-bold">
              {revenueCompare ? (
                <span className={daySummary.revenue >= daySummary.previous.revenue ? 'text-emerald-400' : 'text-red-400'}>{revenueCompare}</span>
              ) : (
                <span className="text-[#A8A29A] font-medium">Nenhuma venda neste dia</span>
              )}
            </div>
          </div>

          {/* Orders on the selected day */}
          <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Pedidos · {dayLabel}</span>
              <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
              {daySummary.count}
            </h3>
            <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-[#A8A29A] font-medium">
              <span>
                {daySummary.cancelled > 0
                  ? `${daySummary.cancelled} cancelado${daySummary.cancelled > 1 ? 's' : ''} (não conta${daySummary.cancelled > 1 ? 'm' : ''})`
                  : `Dia anterior: ${daySummary.previous.count}`}
              </span>
            </div>
          </div>

          {/* Ticket médio on the selected day */}
          <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Ticket Médio · {dayLabel}</span>
              <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
              {formatCurrency(daySummary.ticket)}
            </h3>
            <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-[#A8A29A] font-medium">
              <span>
                {daySummary.count > 0 ? 'Faturado ÷ pedidos do dia' : 'Sem pedidos neste dia'}
              </span>
            </div>
          </div>

          {/* Revenue for the month of the selected day */}
          <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Receita do Mês</span>
              <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
              {formatCurrency(daySummary.monthRevenue)}
            </h3>
            <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-[#A8A29A] font-medium">
              <span className="first-letter:uppercase">{monthLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Graphics Section — order-2 on mobile so it sits below the KPI cards; md and up keeps the original document order */}
      <div className="order-2 md:order-none grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5 sm:mb-8">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2 bg-[#141210] p-5 rounded-xl border border-[#2A211A] shadow-sm">
          {/* Chart Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#2A211A] pb-4">
            <div>
              <h4 className="text-sm font-display font-bold text-[#F5F0EA]">Evolução do Faturamento</h4>
              <p className="text-[11px] text-[#A8A29A] mt-0.5">Selecione o faturamento do seu agrado</p>
            </div>
            <div className="flex items-center gap-1 bg-[#0C0A08] p-1 rounded-lg border border-[#2A211A]">
              <button
                onClick={() => setChartView('semanal')}
                className={`px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartView === 'semanal' 
                    ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shadow-sm' 
                    : 'text-[#A8A29A] hover:text-white'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setChartView('mensal')}
                className={`px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartView === 'mensal' 
                    ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shadow-sm' 
                    : 'text-[#A8A29A] hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setChartView('personalizado')}
                className={`px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartView === 'personalizado' 
                    ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shadow-sm' 
                    : 'text-[#A8A29A] hover:text-white'
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {chartView === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-[#181512] rounded-lg border border-[#2A211A]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#A8A29A] uppercase font-mono font-bold">Início:</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="px-2 py-1 text-xs bg-[#0C0A08] border border-[#2A211A] rounded-md focus:outline-none focus:border-[#FB923C] text-white cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#A8A29A] uppercase font-mono font-bold">Fim:</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="px-2 py-1 text-xs bg-[#0C0A08] border border-[#2A211A] rounded-md focus:outline-none focus:border-[#FB923C] text-white cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-[#FB923C] font-semibold font-mono sm:ml-auto">Previsão dinâmica ativada</span>
            </div>
          )}

          {/* Dynamic Faturamento Banner */}
          <div className="flex items-center justify-between mb-5 bg-[#1F1209] px-3.5 py-2.5 rounded-lg border border-[#4A2A10]">
            <span className="text-xs text-slate-300 font-medium">
              {chartView === 'semanal' && "Total Faturado (7 dias)"}
              {chartView === 'mensal' && "Total Faturado (Mês corrente)"}
              {chartView === 'personalizado' && "Total Faturado no Período Selecionado"}
            </span>
            <span className="text-sm font-black text-[#FB923C] font-mono">
              {formatCurrency(displayedTotal)}
            </span>
          </div>

          <div key={animKey} className={`h-64 ${shouldAnimate ? 'animate-rise-up' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#C2410C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A211A" />
                <XAxis dataKey="date" stroke="#8A7E72" fontSize={11} tickLine={false} />
                <YAxis 
                  domain={[0, yAxisMax]} 
                  stroke="#8A7E72" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(val) => `R$${val}`} 
                />
                <Tooltip 
                  formatter={(val: any) => [formatCurrency(val), 'Faturamento']}
                  contentStyle={{ backgroundColor: '#141210', borderRadius: '12px', color: '#F5F0EA', border: '1px solid #2A211A', fontSize: '11px', padding: '8px 12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#F97316" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  isAnimationActive={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="bg-[#141210] p-5 rounded-xl border border-[#2A211A] shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-display font-bold text-[#F5F0EA]">Métodos de Pagamento</h4>
            <p className="text-[11px] text-[#A8A29A]">Divisão de faturamento por modalidade</p>
          </div>

          {/* Enlarged Chart Container (h-56) */}
          <div className="h-56 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value}% (${formatCurrency((value / 100) * displayedTotal)})`, name]}
                  contentStyle={{ backgroundColor: '#141210', borderRadius: '12px', color: '#F5F0EA', border: '1px solid #2A211A', fontSize: '11px', padding: '8px 12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
              <span className="text-[10px] font-mono font-bold text-[#A8A29A] uppercase tracking-wider">Total</span>
              <p className="text-xl font-display font-black text-[#F5F0EA] leading-tight">100%</p>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="space-y-2 mt-1 border-t border-[#2A211A] pt-3">
            {paymentDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-slate-300 font-semibold truncate">{item.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[#F5F0EA] font-bold font-mono text-xs">
                    {formatCurrency((item.value / 100) * displayedTotal)}
                  </span>
                  <span className="text-[10px] text-[#A8A29A] font-mono font-medium ml-1.5 inline-block">({item.value}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Lists — order-4 on mobile (last), back to normal order from md up */}
      <div className="order-4 md:order-none grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Sellers */}
        <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm">
          <h4 className="text-xs sm:text-sm font-display font-bold text-[#F5F0EA] mb-3 sm:mb-4 flex items-center gap-1.5">
            <Flame className="text-[#F97316] w-4 h-4" />
            Líderes de Saída (Campeões de Venda)
          </h4>
          <div className="divide-y divide-[#2A211A]">
            {topProducts.map((prod, idx) => (
              <div key={prod.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#1F1209] text-[#FB923C] border border-[#4A2A10] flex items-center justify-center font-bold text-xs shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-[#F5F0EA] truncate">{prod.name}</h5>
                    <span className="text-[11px] text-[#A8A29A] block truncate font-mono">{formatCurrency(prod.price)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs sm:text-sm font-bold text-[#F5F0EA] font-mono">{unitsSoldFor(prod)} un.</p>
                  <span className="text-[10px] bg-[#1F1209] text-[#FB923C] border border-[#4A2A10] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">Alta Demanda</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Sellers needing Attention */}
        <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm">
          <h4 className="text-xs sm:text-sm font-display font-bold text-[#F5F0EA] mb-3 sm:mb-4 flex items-center gap-1.5">
            <AlertTriangle className="text-amber-400 w-4 h-4" />
            Baixa Saída (Oportunidade de Upsell)
          </h4>
          <div className="divide-y divide-[#2A211A]">
            {lowProducts.map((prod) => (
              <div key={prod.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover shrink-0 border border-[#2A211A]"
                  />
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-[#F5F0EA] truncate">{prod.name}</h5>
                    <span className="text-[11px] text-[#A8A29A] block truncate font-mono">{formatCurrency(prod.price)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs sm:text-sm font-bold text-[#F5F0EA] font-mono">{unitsSoldFor(prod)} un.</p>
                  <span className="text-[10px] bg-amber-950/40 text-amber-300 border border-amber-800/40 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">Sugestão Combo IA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
