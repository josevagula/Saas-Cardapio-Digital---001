import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Revenue, Expense } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { fetchExpenses, fetchFinanceSettings } from '../../lib/workspaceRepo';
import { loadRevenues, loadCashMovements, netOf } from './financeData';
import { REVENUE_CATEGORY_LABELS, EXPENSE_CATEGORY_LABELS, todayISO, startOfMonthISO, CARD_CLASS, GREEN_TEXT } from './financeShared';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Wallet, Receipt, Target } from 'lucide-react';

const PIE_COLORS = ['#F97316', '#FB923C', '#FBBF24', '#F59E0B', '#EA580C', '#C2410C'];
const TOOLTIP_STYLE = { background: '#141210', border: '1px solid #2A211A', fontSize: 11 };
const money = (v: number) => `R$ ${formatCurrency(v)}`;

export default function FinanceDashboard() {
  const { isDemoMode, orders } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [paidExpenses, setPaidExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const monthStart = startOfMonthISO();

  useEffect(() => {
    if (!userId || isDemoMode) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const settings = await fetchFinanceSettings(userId);
        const [rev, exp, movements] = await Promise.all([
          loadRevenues(userId, orders, { start: monthStart, end: today }),
          // An expense counts in the month it was PAID, whatever its due date.
          fetchExpenses(userId),
          loadCashMovements(userId, orders, { start: settings.initialBalanceDate, end: today })
        ]);
        if (cancelled) return;
        setRevenues(rev);
        setPaidExpenses(exp.filter(e => e.status === 'pago' && !!e.paidDate && e.paidDate >= monthStart && e.paidDate <= today));
        setBalance(settings.initialBalance + movements.reduce((s, m) => s + netOf(m), 0));
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, isDemoMode, orders, monthStart, today]);

  const receitaHoje = revenues.filter(r => r.occurredAt === today).reduce((s, r) => s + r.amount, 0);
  const receitaMes = revenues.reduce((s, r) => s + r.amount, 0);
  const despesasMes = paidExpenses.reduce((s, e) => s + e.amount, 0);
  const lucroMes = receitaMes - despesasMes;
  const orderRevenues = revenues.filter(r => r.origin === 'pedido_automatico');
  const ticketMedio = orderRevenues.length > 0 ? orderRevenues.reduce((s, r) => s + r.amount, 0) / orderRevenues.length : 0;

  // Every day of the month so far, including days without sales.
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    revenues.forEach(r => { map[r.occurredAt] = (map[r.occurredAt] || 0) + r.amount; });
    const days: { date: string; amount: number }[] = [];
    const lastDay = Number(today.slice(8, 10));
    for (let d = 1; d <= lastDay; d++) {
      const dd = String(d).padStart(2, '0');
      days.push({ date: dd, amount: Math.round((map[`${monthStart.slice(0, 8)}${dd}`] || 0) * 100) / 100 });
    }
    return days;
  }, [revenues, monthStart, today]);

  const revenueByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    revenues.forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount; });
    return Object.entries(map).map(([k, v]) => ({ name: REVENUE_CATEGORY_LABELS[k as keyof typeof REVENUE_CATEGORY_LABELS] ?? k, value: Math.round(v * 100) / 100 }));
  }, [revenues]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    paidExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([k, v]) => ({ name: EXPENSE_CATEGORY_LABELS[k as keyof typeof EXPENSE_CATEGORY_LABELS] ?? k, value: Math.round(v * 100) / 100 }));
  }, [paidExpenses]);

  if (isDemoMode) {
    return <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4">Modo demonstração: o Dashboard Financeiro fica disponível assim que você entrar com sua conta real.</div>;
  }

  const cards = [
    { label: 'Receita Hoje', value: receitaHoje, icon: DollarSign, color: GREEN_TEXT },
    { label: 'Receita do Mês', value: receitaMes, icon: TrendingUp, color: GREEN_TEXT },
    { label: 'Despesas Pagas no Mês', value: despesasMes, icon: TrendingDown, color: 'text-red-400' },
    { label: 'Lucro do Mês', value: lucroMes, icon: Receipt, color: lucroMes >= 0 ? 'text-[#F97316]' : 'text-red-400' },
    { label: 'Saldo em Caixa', value: balance, icon: Wallet, color: balance >= 0 ? 'text-white' : 'text-red-400' },
    { label: 'Ticket Médio do Mês', value: ticketMedio, icon: Target, color: 'text-white' }
  ];

  return (
    <div className="space-y-6">
      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">{error}</div>}
      <p className="text-[11px] text-[#A8A29A]">
        Receita = pedidos entregues (na data do pedido) + receitas manuais.{loading && ' Carregando...'}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.label} className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-[#A8A29A] uppercase tracking-wide">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-xl font-display font-extrabold font-mono ${card.color}`}>{money(card.value)}</p>
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
              <Tooltip formatter={(v: number) => [money(v), 'Receita']} labelFormatter={(d) => `Dia ${d}`} contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="amount" stroke="#F97316" fill="url(#financeRevGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Receita por Categoria (mês)', data: revenueByCategory },
          { title: 'Despesas Pagas por Categoria (mês)', data: expensesByCategory }
        ].map(chart => (
          <div key={chart.title} className={CARD_CLASS}>
            <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4">{chart.title}</h3>
            {chart.data.length === 0 ? <p className="text-xs text-[#A8A29A]">Sem dados no período.</p> : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 10, fill: '#A8A29A' }}>
                      {chart.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => money(v)} contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
