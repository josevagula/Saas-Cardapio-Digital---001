import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
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
  ArrowUpRight,
  Activity,
  Flame,
  AlertTriangle,
  FileDown
} from 'lucide-react';

export default function DashboardOverview() {
  const { analytics, products, orders, visualConfig, isDemoMode } = useApp();

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

  // KPI figures: the demo dataset keeps its intentionally impressive
  // revenue numbers, every real account only ever shows what it actually
  // sold — but Total de Pedidos always tracks whichever period is selected
  // above (semanal, mensal or personalizado), demo included, exactly like a
  // real account would.
  const kpi = isDemoMode
    ? { dailyRevenue: analytics.dailyRevenue, weeklyRevenue: analytics.weeklyRevenue, monthlyRevenue: analytics.monthlyRevenue, totalOrders: periodOrders.length, ticketAverage: analytics.ticketAverage }
    : { dailyRevenue: realStats.dailyRevenue, weeklyRevenue: realStats.weeklyRevenue, monthlyRevenue: realStats.monthlyRevenue, totalOrders: periodOrders.length, ticketAverage: realStats.ticketAverage };

  // Determine active chart data and total based on the selected view
  let displayedChartData: { date: string; amount: number }[] = [];
  let displayedTotal = 0;

  if (chartView === 'semanal') {
    displayedChartData = isDemoMode ? analytics.revenueHistory : realStats.weeklyHistory;
    displayedTotal = kpi.weeklyRevenue;
  } else if (chartView === 'mensal') {
    displayedChartData = isDemoMode ? [
      { date: '01/07', amount: 1250 },
      { date: '04/07', amount: 1800 },
      { date: '08/07', amount: 1450 },
      { date: '12/07', amount: 2200 },
      { date: '16/07', amount: 1950 },
      { date: '20/07', amount: 2600 },
      { date: '24/07', amount: 2100 },
      { date: '28/07', amount: 3100 },
      { date: '30/07', amount: 3400 },
    ] : realStats.monthlyHistory;
    displayedTotal = kpi.monthlyRevenue;
  } else if (isDemoMode) {
    // Custom date range mock distribution — demo only.
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dataList = [];
    let sum = 0;
    const daysDiff = Math.min(31, Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1));

    for (let i = 0; i < daysDiff; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const dayStr = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      // Generate a stable visual pseudo-random amount based on date factors
      const seed = (current.getDate() * 23 + current.getMonth() * 37) % 6;
      const amount = 180 + seed * 135 + (i % 4) * 55;
      dataList.push({ date: dayStr, amount });
      sum += amount;
    }
    displayedChartData = dataList;
    displayedTotal = sum;
  } else {
    // Custom date range: real orders placed within the selected window.
    const days = revenueHistoryByDay(orders, new Date(startDate), new Date(endDate));
    displayedChartData = days;
    displayedTotal = Math.round(days.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  }

  // Only ever built from orders that were actually placed and paid — a
  // payment method with zero real orders in the period simply doesn't
  // appear, instead of a fixed 4-way mock split.
  const paymentDistribution = isDemoMode ? analytics.paymentDistribution : (() => {
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
  const unitsSoldFor = (p: Product) => isDemoMode ? p.salesCount : (realUnitsSoldByProductId[p.id] || 0);

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

      {/* KPI Cards Grid — order-1 on mobile so it takes the top slot above the chart; back to document order from md up */}
      <div className="order-1 md:order-none grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-8">
        {/* Monthly Revenue */}
        <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Receita Mensal</span>
            <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
            {formatCurrency(kpi.monthlyRevenue)}
          </h3>
          <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-[#F97316] font-bold">
            {isDemoMode ? (
              <>
                <ArrowUpRight className="w-3 h-3" />
                <span>+14.3% este mês</span>
              </>
            ) : (
              <span className="text-[#A8A29A]">Baseado em vendas reais</span>
            )}
          </div>
        </div>

        {/* Daily Revenue */}
        <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Hoje</span>
            <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
            {formatCurrency(kpi.dailyRevenue)}
          </h3>
          <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-[#A8A29A] font-medium">
            <Activity className="w-3 h-3 text-[#FB923C] animate-pulse" />
            <span>Atualizado há pouco</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Total de Pedidos</span>
            <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
            {kpi.totalOrders}
          </h3>
          <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-[#F97316] font-bold">
            <span className="text-[#A8A29A]">
              {chartView === 'semanal' && 'Pedidos reais (7 dias)'}
              {chartView === 'mensal' && 'Pedidos reais (mês corrente)'}
              {chartView === 'personalizado' && 'Pedidos reais (período selecionado)'}
            </span>
          </div>
        </div>

        {/* Ticket Average */}
        <div className="bg-[#141210] p-3.5 sm:p-5 rounded-xl border border-[#2A211A] shadow-sm relative overflow-hidden transition-all hover:border-[#3A2E24]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">Ticket Médio</span>
            <div className="p-1 sm:p-1.5 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3 className="text-base sm:text-xl font-display font-black text-[#F5F0EA] mt-2 sm:mt-3 font-mono">
            {formatCurrency(kpi.ticketAverage)}
          </h3>
          <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-[#FB923C] font-bold">
            {isDemoMode ? (
              <>
                <ArrowUpRight className="w-3 h-3" />
                <span>Fidelidade ativa: 72%</span>
              </>
            ) : (
              <span className="text-[#A8A29A]">Média por pedido real</span>
            )}
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
