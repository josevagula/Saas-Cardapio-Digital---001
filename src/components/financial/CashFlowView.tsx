import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { FinanceSettings, FinancialTransaction } from '../../types';
import { formatCurrency, parseCashAmount } from '../../utils/formatters';
import { fetchCashFlowDaily, fetchFinancialTransactions, fetchFinanceSettings, saveFinanceSettings, createCashAdjustment } from '../../lib/workspaceRepo';
import { todayISO, isoDaysAgo, startOfMonthISO, startOfYearISO, formatDateBR, CARD_CLASS } from './financeShared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Settings, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function CashFlowView() {
  const { isDemoMode } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [dailyTotals, setDailyTotals] = useState<{ today: number; week: number; month: number; year: number }>({ today: 0, week: 0, month: 0, year: 0 });
  const [chartData, setChartData] = useState<{ date: string; entradas: number; saidas: number }[]>([]);
  const [timeline, setTimeline] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [initialBalanceInput, setInitialBalanceInput] = useState('0');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({ description: '', amount: '', occurredAt: todayISO() });

  const load = async () => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    setError(null);
    try {
      const [s, yearFlow, tl] = await Promise.all([
        fetchFinanceSettings(userId),
        fetchCashFlowDaily(userId, { start: startOfYearISO(), end: todayISO() }),
        fetchFinancialTransactions(userId, { start: isoDaysAgo(90), end: todayISO() })
      ]);
      setSettings(s);
      setInitialBalanceInput(s.initialBalance.toString());

      const today = todayISO();
      const weekStart = isoDaysAgo(6);
      const monthStart = startOfMonthISO();
      const sums = { today: 0, week: 0, month: 0, year: 0 };
      yearFlow.forEach(d => {
        sums.year += d.net;
        if (d.occurredAt >= monthStart) sums.month += d.net;
        if (d.occurredAt >= weekStart) sums.week += d.net;
        if (d.occurredAt === today) sums.today += d.net;
      });
      setDailyTotals(sums);

      const last14 = yearFlow.slice(-14);
      setChartData(last14.map(d => ({ date: formatDateBR(d.occurredAt).slice(0, 5), entradas: d.inflow, saidas: d.outflow })));
      setTimeline(tl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId, isDemoMode]);

  const currentBalance = (settings?.initialBalance ?? 0) + dailyTotals.year;

  // Saldo acumulado da timeline, calculado no client a partir do saldo
  // inicial — nunca guardado por linha (um lançamento retroativo não pode
  // quebrar uma cadeia de saldo já persistida).
  const timelineWithBalance = useMemo(() => {
    const sorted = [...timeline].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id - b.id);
    let running = settings?.initialBalance ?? 0;
    const withBalance = sorted.map(t => {
      running += t.direction === 'in' ? t.amount : -t.amount;
      return { ...t, balanceAfter: running };
    });
    return withBalance.reverse();
  }, [timeline, settings]);

  const saveSettings = async () => {
    if (!userId || !settings) return;
    const value = parseCashAmount(initialBalanceInput);
    try {
      await saveFinanceSettings(userId, { initialBalance: value, initialBalanceDate: settings.initialBalanceDate, cogsPercent: settings.cogsPercent });
      setShowSettings(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const amount = parseCashAmount(adjustmentForm.amount);
    if (!adjustmentForm.description || amount === 0) return;
    try {
      await createCashAdjustment(userId, { description: adjustmentForm.description, amount, occurredAt: adjustmentForm.occurredAt });
      setAdjustmentForm({ description: '', amount: '', occurredAt: todayISO() });
      setShowAdjustmentForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isDemoMode) {
    return <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4">Modo demonstração: o fluxo de caixa fica disponível assim que você entrar com sua conta real.</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`${CARD_CLASS} bg-gradient-to-br from-[#1F1209] to-[#141210]`}>
          <p className="text-[10px] font-semibold text-[#FB923C] uppercase tracking-wide">Saldo Atual</p>
          <p className="text-lg font-display font-extrabold font-mono mt-1 text-white">R$ {formatCurrency(currentBalance)}</p>
        </div>
        {[
          { label: 'Hoje', value: dailyTotals.today },
          { label: 'Semana', value: dailyTotals.week },
          { label: 'Mês', value: dailyTotals.month },
          { label: 'Ano', value: dailyTotals.year }
        ].map(card => (
          <div key={card.label} className={CARD_CLASS}>
            <p className="text-[10px] font-semibold text-[#A8A29A] uppercase tracking-wide">{card.label}</p>
            <p className={`text-lg font-display font-extrabold font-mono mt-1 ${card.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {card.value >= 0 ? '+' : ''}R$ {formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[#2A211A] rounded-xl text-slate-300 cursor-pointer">
          <Settings className="w-3.5 h-3.5" /> Saldo Inicial
        </button>
        <button onClick={() => setShowAdjustmentForm(s => !s)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[#2A211A] rounded-xl text-slate-300 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Ajuste Manual
        </button>
      </div>

      {showSettings && (
        <div className={`${CARD_CLASS} flex items-end gap-3`}>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Saldo inicial (R$)</label>
            <input value={initialBalanceInput} onChange={e => setInitialBalanceInput(e.target.value)} className="px-3 py-2 text-xs input-sushi font-mono w-40" />
          </div>
          <button onClick={saveSettings} className="btn-sushi-primary text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Salvar</button>
        </div>
      )}

      {showAdjustmentForm && (
        <form onSubmit={submitAdjustment} className={`${CARD_CLASS} flex flex-col md:flex-row md:items-end gap-3`}>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Descrição</label>
            <input required value={adjustmentForm.description} onChange={e => setAdjustmentForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Valor (negativo = saída)</label>
            <input required value={adjustmentForm.amount} onChange={e => setAdjustmentForm(f => ({ ...f, amount: e.target.value }))} className="px-3 py-2 text-xs input-sushi font-mono w-40" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Data</label>
            <input type="date" value={adjustmentForm.occurredAt} onChange={e => setAdjustmentForm(f => ({ ...f, occurredAt: e.target.value }))} className="px-3 py-2 text-xs input-sushi" />
          </div>
          <button type="submit" className="btn-sushi-primary text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Adicionar</button>
        </form>
      )}

      <div className={CARD_CLASS}>
        <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4">Entradas x Saídas (últimos 14 dias com movimento)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A211A" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A8A29A' }} />
              <YAxis tick={{ fontSize: 10, fill: '#A8A29A' }} />
              <Tooltip contentStyle={{ background: '#141210', border: '1px solid #2A211A', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4 border-b border-[#2A211A] pb-3">Timeline Financeira</h3>
        {loading ? (
          <p className="text-xs text-[#A8A29A]">Carregando...</p>
        ) : timelineWithBalance.length === 0 ? (
          <p className="text-xs text-[#A8A29A]">Nenhuma movimentação nos últimos 90 dias.</p>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {timelineWithBalance.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-[#2A211A] bg-[#181512]">
                <div className="flex items-center gap-2 min-w-0">
                  {t.direction === 'in' ? <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <ArrowDownCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F5F0EA] truncate">{t.description}</p>
                    <p className="text-[10px] text-[#A8A29A]">{formatDateBR(t.occurredAt)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-mono font-bold ${t.direction === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.direction === 'in' ? '+' : '-'}R$ {t.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[#A8A29A] font-mono">saldo: R$ {t.balanceAfter.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
