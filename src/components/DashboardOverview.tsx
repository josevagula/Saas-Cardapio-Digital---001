import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
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
  Sparkles, 
  Activity, 
  Flame, 
  AlertTriangle,
  Lightbulb,
  FileDown
} from 'lucide-react';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro'
};

export default function DashboardOverview() {
  const { analytics, products, orders, analyzeAISales, visualConfig, isDemoMode } = useApp();
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  // Chart view state and custom date ranges
  const [chartView, setChartView] = useState<'semanal' | 'mensal' | 'personalizado'>('semanal');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-07');

  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Sums this account's real orders per day across [start, end] (inclusive).
  // Used for every non-demo chart/KPI below so a real account with zero
  // orders always shows zero instead of placeholder/mock figures.
  const sumOrdersByDay = (start: Date, end: Date) => {
    const dayCount = Math.min(366, Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1));
    const days: { date: string; amount: number }[] = [];
    for (let i = 0; i < dayCount; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const dayTotal = orders
        .filter(o => new Date(o.createdAt).toDateString() === current.toDateString())
        .reduce((sum, o) => sum + o.total, 0);
      days.push({ date: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), amount: Math.round(dayTotal * 100) / 100 });
    }
    return days;
  };

  // Real revenue/order figures derived directly from this account's actual
  // orders — never from the (separately-persisted, easily stale) analytics
  // snapshot — so the dashboard only ever counts what was really sold.
  const realStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const weeklyHistory = sumOrdersByDay(weekStart, today);
    const weeklyRevenue = Math.round(weeklyHistory.reduce((s, d) => s + d.amount, 0) * 100) / 100;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyHistory = sumOrdersByDay(monthStart, today);
    const monthlyRevenue = Math.round(monthlyHistory.reduce((s, d) => s + d.amount, 0) * 100) / 100;

    const dailyRevenue = Math.round(
      orders
        .filter(o => new Date(o.createdAt).toDateString() === today.toDateString())
        .reduce((sum, o) => sum + o.total, 0) * 100
    ) / 100;

    const totalOrders = orders.length;
    const totalRevenueAllTime = orders.reduce((sum, o) => sum + o.total, 0);
    const ticketAverage = totalOrders > 0 ? Math.round((totalRevenueAllTime / totalOrders) * 100) / 100 : 0;

    return { weeklyHistory, weeklyRevenue, monthlyHistory, monthlyRevenue, dailyRevenue, totalOrders, ticketAverage };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // KPI figures: the demo dataset keeps its intentionally impressive mock
  // numbers, every real account only ever shows what it actually sold.
  const kpi = isDemoMode
    ? { dailyRevenue: analytics.dailyRevenue, weeklyRevenue: analytics.weeklyRevenue, monthlyRevenue: analytics.monthlyRevenue, totalOrders: analytics.totalOrders, ticketAverage: analytics.ticketAverage }
    : { dailyRevenue: realStats.dailyRevenue, weeklyRevenue: realStats.weeklyRevenue, monthlyRevenue: realStats.monthlyRevenue, totalOrders: realStats.totalOrders, ticketAverage: realStats.ticketAverage };

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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = sumOrdersByDay(start, end);
    displayedChartData = days;
    displayedTotal = Math.round(days.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  }

  // Real orders placed within the currently selected period (same window as
  // the revenue chart above) — used to build the payment-method split below
  // from what was actually paid, instead of a fixed mock percentage split.
  const getPeriodOrders = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let periodStart: Date;
    let periodEnd = today;
    if (chartView === 'semanal') {
      periodStart = new Date(today);
      periodStart.setDate(today.getDate() - 6);
    } else if (chartView === 'mensal') {
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      periodStart = new Date(startDate);
      periodEnd = new Date(endDate);
    }
    const exclusiveEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1);
    return orders.filter(o => {
      const created = new Date(o.createdAt);
      return created >= periodStart && created < exclusiveEnd;
    });
  };

  // Only ever built from orders that were actually placed and paid — a
  // payment method with zero real orders in the period simply doesn't
  // appear, instead of a fixed 4-way mock split.
  const paymentDistribution = isDemoMode ? analytics.paymentDistribution : (() => {
    const totals: Record<string, number> = {};
    getPeriodOrders().forEach(o => {
      totals[o.paymentMethod] = (totals[o.paymentMethod] || 0) + o.total;
    });
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    if (sum <= 0) return [];
    return Object.entries(totals).map(([method, amount]) => ({
      name: PAYMENT_METHOD_LABELS[method] || method,
      value: Math.round((amount / sum) * 100)
    }));
  })();

  // Real units sold per product, counted straight from every order's line
  // items — the product record's own salesCount can drift (e.g. a customer
  // testing checkout on the owner's own public menu link in a logged-in
  // browser used to double-count it; fixed above, but this sidesteps that
  // counter entirely and is always exactly what was ordered).
  const realUnitsSoldByProductId = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        counts[item.product.id] = (counts[item.product.id] || 0) + item.quantity;
      });
    });
    return counts;
  }, [orders]);
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

  const handleAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const data = await analyzeAISales();
      setAiAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

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

          <button
            onClick={handleAIAnalysis}
            disabled={loadingAI}
            className="flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-75 w-full sm:w-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-200 fill-orange-200" />
            <span>{loadingAI ? "Analisando..." : "Consultar Sushi IA"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid — order-2 on mobile so the chart below takes the top slot; back to document order from md up */}
      <div className="order-2 md:order-none grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-8">
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
            {isDemoMode ? (
              <>
                <ArrowUpRight className="w-3 h-3" />
                <span>+8.2% conversão</span>
              </>
            ) : (
              <span className="text-[#A8A29A]">Pedidos reais recebidos</span>
            )}
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

      {/* AI Consulting Dynamic Response Card — order-3 on mobile, keeps its normal spot from md up */}
      {aiAnalysis && (
        <div className="order-3 md:order-none bg-[#141210] text-slate-100 p-4 sm:p-6 md:p-8 rounded-xl shadow-xl mb-5 sm:mb-8 border border-[#4A2A10] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkles className="w-64 h-64 text-[#FB923C]" />
          </div>

          <div className="flex items-center justify-between border-b border-[#2A211A] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C2410C] to-[#F97316] flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h4 className="text-base font-display font-bold text-[#F5F0EA] tracking-tight">Mapeamento Estratégico Sushi AI</h4>
                <p className="text-xs text-[#A8A29A]">Resultados da análise com inteligência artificial para {visualConfig.establishmentName}</p>
              </div>
            </div>
            <button 
              onClick={() => setAiAnalysis(null)}
              className="text-xs text-[#A8A29A] hover:text-white underline transition-colors cursor-pointer"
            >
              Fechar Análise
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h5 className="text-xs font-mono text-[#FB923C] uppercase tracking-wider font-bold flex items-center gap-2 mb-2">
                  <Flame className="w-3.5 h-3.5 text-[#F97316]" />
                  Alavancagem de Campeões
                </h5>
                <p className="text-sm text-slate-300 leading-relaxed">{aiAnalysis.championsAnalysis}</p>
              </div>

              <div>
                <h5 className="text-xs font-mono text-amber-400 uppercase tracking-wider font-bold flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Recuperação de Itens Baixos
                </h5>
                <p className="text-sm text-slate-300 leading-relaxed">{aiAnalysis.lowPerformingAnalysis}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h5 className="text-xs font-mono text-[#FB923C] uppercase tracking-wider font-bold flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Oportunidades de Crescimento
                </h5>
                <ul className="space-y-2.5">
                  {aiAnalysis.opportunities.map((item: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
                      <span className="text-[#F97316] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-[#0C0A08] rounded-xl border border-[#2A211A]">
                <h5 className="text-xs font-mono text-[#FB923C] uppercase tracking-wider font-bold mb-1.5">Previsão e Projeções</h5>
                <p className="text-xs text-[#A8A29A] leading-relaxed">{aiAnalysis.forecastSummary}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Graphics Section — order-1 puts it right under the header on mobile (its own size is untouched); md and up keeps the original document order */}
      <div className="order-1 md:order-none grid grid-cols-1 lg:grid-cols-3 gap-6 mb-5 sm:mb-8">
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
                    <span className="text-[11px] text-[#A8A29A] block truncate">{prod.ingredients.length} ingredientes</span>
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
