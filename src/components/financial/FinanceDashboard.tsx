import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Revenue, Expense } from '../../types';
import { computeRealSalesSummary } from '../../utils/salesStats';
import { formatCurrency } from '../../utils/formatters';
import { fetchRevenues, fetchExpenses, fetchCashFlowDaily, fetchFinanceSettings } from '../../lib/workspaceRepo';
import { REVENUE_CATEGORY_LABELS, EXPENSE_CATEGORY_LABELS, todayISO, startOfMonthISO, startOfYearISO, CARD_CLASS } from './financeShared';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Wallet, Receipt, Target } from 'lucide-react';

const PIE_COLORS = ['#F97316', '#FB923C', '#FBBF24', '#F59E0B', '#EA580C', '#C2410C'];

export default function FinanceDashboard() {
  const { isDemoMode, orders } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashFlowToday, setCashFlowToday] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salesSummary = useMemo(() => computeRealSalesSummary(orders), [orders]);

  useEffect(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchRevenues(userId, { start: startOfYearISO(), end: todayISO() }),
      fetchExpenses(userId, { start: startOfYearISO(), end: todayISO() }),
      fetchCashFlowDaily(userId, { start: startOfYearISO(), end: todayISO() }),
      fetchFinanceSettings(userId)
    ]).then(([rev, exp, flow, settings]) => {
      setRevenues(rev);
      setExpenses(exp);
      setInitialBalance(settings.initialBalance);
      setCashFlowToday(flow.reduce((s, d) => s + d.net, 0));
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, isDemoMode]);

  const today = todayISO();
  const monthStart = startOfMonthISO();

  const receitaHoje = revenues.filter(r => r.occurredAt === today).reduce((s, r) => s + r.amount, 0);
  const receitaMes = revenues.filter(r => r.occurredAt >= monthStart).reduce((s, r) => s + r.amount, 0);
  const despesasMes = expenses.filter(e => e.status === 'pago' && (e.paidDate ?? '') >= monthStart).reduce((s, e) => s + e.amount, 0);
  const lucroMes = receitaMes - despesasMes;
  const saldoAtual = initialBalance + cashFlowToday;

  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    revenues.filter(r => r.occurredAt >= monthStart).forEach(r => { map[r.occurredAt] = (map[r.occurredAt] || 0) + r.amount; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date: date.slice(8, 10), amount }));
  }, [revenues, monthStart]);

  const revenueByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    revenues.forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount; });
    return Object.entries(map).map(([k, v]) => ({ name: REVENUE_CATEGORY_LABELS[k as keyof typeof REVENUE_CATEGORY_LABELS] ?? k, value: v }));
  }, [revenues]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([k, v]) => ({ name: EXPENSE_CATEGORY_LABELS[k as keyof typeof EXPENSE_CATEGORY_LABELS] ?? k, value: v }));
  }, [expenses]);

  if (isDemoMode) {
    return <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4">Modo demonstração: o Dashboard Financeiro completo fica disponível assim que você entrar com sua conta real. Veja abaixo os indicadores gerais de vendas simulados.</div>;
  }

  const cards = [
    { label: 'Receita Hoje', value: receitaHoje, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Receita do Mês', value: receitaMes, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Despesas do Mês', value: despesasMes, icon: TrendingDown, color: 'text-red-400' },
    { label: 'Lucro do Mês', value: lucroMes, icon: Receipt, color: lucroMes >= 0 ? 'text-[#F97316]' : 'text-red-400' },
    { label: 'Fluxo de Caixa Atual', value: saldoAtual, icon: Wallet, color: 'text-white' },
    { label: 'Ticket Médio', value: salesSummary.ticketAverage, icon: Target, color: 'text-white' }
  ];

  return (
    <div className="space-y-6">
      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">{error}</div>}
      {loading && <p className="text-xs text-[#A8A29A]">Carregando...</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.label} className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-[#A8A29A] uppercase tracking-wide">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-xl font-display font-extrabold font-mono ${card.color}`}>R$ {formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      <div className={CARD_CLASS}>
        <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4">Receita por Dia (mês atual)</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="financeRevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A211A" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A8A29A' }} />
              <YAxis tick={{ fontSize: 10, fill: '#A8A29A' }} />
              <Tooltip contentStyle={{ background: '#141210', border: '1px solid #2A211A', fontSize: 11 }} />
              <Area type="monotone" dataKey="amount" stroke="#F97316" fill="url(#financeRevGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={CARD_CLASS}>
          <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4">Receita por Categoria</h3>
          {revenueByCategory.length === 0 ? <p className="text-xs text-[#A8A29A]">Sem dados no período.</p> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 10, fill: '#A8A29A' }}>
                    {revenueByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#141210', border: '1px solid #2A211A', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className={CARD_CLASS}>
          <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4">Despesas por Categoria</h3>
          {expensesByCategory.length === 0 ? <p className="text-xs text-[#A8A29A]">Sem dados no período.</p> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 10, fill: '#A8A29A' }}>
                    {expensesByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#141210', border: '1px solid #2A211A', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
