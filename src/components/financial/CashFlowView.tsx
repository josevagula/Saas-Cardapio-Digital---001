import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { FinanceSettings } from '../../types';
import { formatCurrency, parseCashAmount } from '../../utils/formatters';
import { fetchFinanceSettings, saveFinanceSettings, createCashAdjustment } from '../../lib/workspaceRepo';
import { loadCashMovements, dailyTotals, netOf, CashMovement } from './financeData';
import { todayISO, isoDaysAgo, startOfMonthISO, startOfYearISO, formatDateBR, CARD_CLASS, GREEN_TEXT } from './financeShared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Settings, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const TIMELINE_DAYS = 90;

// parseCashAmount drops the minus sign, so the sign is read separately —
// a negative adjustment is money going out.
const parseSignedAmount = (val: string): number => {
  const amount = parseCashAmount(val);
  return val.trim().startsWith('-') ? -amount : amount;
};

export default function CashFlowView() {
  const { isDemoMode, orders } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [initialBalanceInput, setInitialBalanceInput] = useState('0');
  const [initialBalanceDateInput, setInitialBalanceDateInput] = useState(todayISO());
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({ description: '', amount: '', occurredAt: todayISO() });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId || isDemoMode) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const s = await fetchFinanceSettings(userId);
        // Everything since the opening balance date: the balance needs all of
        // it, not just the slice shown on screen.
        const all = await loadCashMovements(userId, orders, { start: s.initialBalanceDate, end: todayISO() });
        if (cancelled) return;
        setSettings(s);
        setInitialBalanceInput(formatCurrency(s.initialBalance));
        setInitialBalanceDateInput(s.initialBalanceDate > '2000-01-01' ? s.initialBalanceDate : todayISO());
        setMovements(all);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, isDemoMode, orders, reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const totals = useMemo(() => {
    const today = todayISO();
    const weekStart = isoDaysAgo(6);
    const monthStart = startOfMonthISO();
    const yearStart = startOfYearISO();
    const sums = { all: 0, today: 0, week: 0, month: 0, year: 0 };
    movements.forEach(m => {
      const net = netOf(m);
      sums.all += net;
      if (m.occurredAt >= yearStart) sums.year += net;
      if (m.occurredAt >= monthStart) sums.month += net;
      if (m.occurredAt >= weekStart) sums.week += net;
      if (m.occurredAt === today) sums.today += net;
    });
    return sums;
  }, [movements]);

  const currentBalance = (settings?.initialBalance ?? 0) + totals.all;

  const chartData = useMemo(() =>
    dailyTotals(movements).slice(-14).map(d => ({
      date: formatDateBR(d.occurredAt).slice(0, 5),
      entradas: Math.round(d.inflow * 100) / 100,
      saidas: Math.round(d.outflow * 100) / 100
    })), [movements]);

  // Running balance computed here from the opening balance over EVERY
  // movement since its date — never stored per row (a backdated entry can't
  // break an already-persisted chain) — then trimmed to the last 90 days.
  const timeline = useMemo(() => {
    let running = settings?.initialBalance ?? 0;
    const cutoff = isoDaysAgo(TIMELINE_DAYS);
    return movements
      .map(m => {
        running += netOf(m);
        return { ...m, balanceAfter: running };
      })
      .filter(m => m.occurredAt >= cutoff)
      .reverse();
  }, [movements, settings]);

  const saveSettings = async () => {
    if (!userId || !settings) return;
    try {
      await saveFinanceSettings(userId, {
        initialBalance: parseSignedAmount(initialBalanceInput),
        initialBalanceDate: initialBalanceDateInput || todayISO(),
        cogsPercent: settings.cogsPercent
      });
      setShowSettings(false);
      reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const amount = parseSignedAmount(adjustmentForm.amount);
    if (!adjustmentForm.description || amount === 0) return;
    try {
      await createCashAdjustment(userId, { description: adjustmentForm.description, amount, occurredAt: adjustmentForm.occurredAt });
      setAdjustmentForm({ description: '', amount: '', occurredAt: todayISO() });
      setShowAdjustmentForm(false);
      reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isDemoMode) {
    return <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4">Modo demonstração: o fluxo de caixa fica disponível assim que você entrar com sua conta real.</div>;
  }

  const hasBalanceDate = !!settings && settings.initialBalanceDate > '2000-01-01';

  return (
    <div className="space-y-6">
      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">{error}</div>}
      <p className="text-[11px] text-[#A8A29A]">
        Entradas = pedidos entregues + receitas manuais. Saídas = despesas pagas. Ajustes manuais entram como entrada ou saída.
        {hasBalanceDate && ` Saldo contado a partir de ${formatDateBR(settings!.initialBalanceDate)}.`}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`${CARD_CLASS} bg-gradient-to-br from-[#1F1209] to-[#141210]`}>
          <p className="text-[10px] font-semibold text-[#FB923C] uppercase tracking-wide">Saldo Atual</p>
          <p className={`text-lg font-display font-extrabold font-mono mt-1 ${currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {formatCurrency(currentBalance)}</p>
        </div>
        {[
          { label: 'Hoje', value: totals.today },
          { label: 'Últimos 7 dias', value: totals.week },
          { label: 'Mês', value: totals.month },
          { label: 'Ano', value: totals.year }
        ].map(card => (
          <div key={card.label} className={CARD_CLASS}>
            <p className="text-[10px] font-semibold text-[#A8A29A] uppercase tracking-wide">{card.label}</p>
            <p className={`text-lg font-display font-extrabold font-mono mt-1 ${card.value >= 0 ? GREEN_TEXT : 'text-red-400'}`}>
              {card.value >= 0 ? '+' : '-'}R$ {formatCurrency(Math.abs(card.value))}
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
        <div className={`${CARD_CLASS} flex flex-col md:flex-row md:items-end gap-3`}>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Saldo inicial em caixa (R$)</label>
            <input value={initialBalanceInput} onChange={e => setInitialBalanceInput(e.target.value)} className="px-3 py-2 text-xs input-sushi font-mono w-40" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Na data</label>
            <input type="date" value={initialBalanceDateInput} onChange={e => setInitialBalanceDateInput(e.target.value)} className="px-3 py-2 text-xs input-sushi" />
          </div>
          <button onClick={saveSettings} className="btn-sushi-primary text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Salvar</button>
          <p className="text-[10px] text-[#A8A29A] md:max-w-xs">Movimentos anteriores a essa data não entram no saldo.</p>
        </div>
      )}

      {showAdjustmentForm && (
        <form onSubmit={submitAdjustment} className={`${CARD_CLASS} flex flex-col md:flex-row md:items-end gap-3`}>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Descrição</label>
            <input required value={adjustmentForm.description} onChange={e => setAdjustmentForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 text-xs input-sushi" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Valor (use - para saída, ex: -50)</label>
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
        {chartData.length === 0 ? <p className="text-xs text-[#A8A29A]">Nenhuma movimentação ainda.</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A211A" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A8A29A' }} />
                <YAxis tick={{ fontSize: 10, fill: '#A8A29A' }} />
                <Tooltip formatter={(v: number, name: string) => [`R$ ${formatCurrency(v)}`, name === 'entradas' ? 'Entradas' : 'Saídas']} contentStyle={{ background: '#141210', border: '1px solid #2A211A', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(name: string) => (name === 'entradas' ? 'Entradas' : 'Saídas')} />
                <Bar dataKey="entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className={CARD_CLASS}>
        <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4 border-b border-[#2A211A] pb-3">Timeline Financeira (últimos {TIMELINE_DAYS} dias)</h3>
        {loading ? (
          <p className="text-xs text-[#A8A29A]">Carregando...</p>
        ) : timeline.length === 0 ? (
          <p className="text-xs text-[#A8A29A]">Nenhuma movimentação nos últimos {TIMELINE_DAYS} dias.</p>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {timeline.map(t => (
              <div key={t.key} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-[#2A211A] bg-[#181512]">
                <div className="flex items-center gap-2 min-w-0">
                  {t.direction === 'in' ? <ArrowUpCircle className={`w-3.5 h-3.5 ${GREEN_TEXT} shrink-0`} /> : <ArrowDownCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F5F0EA] truncate">{t.description}</p>
                    <p className="text-[10px] text-[#A8A29A]">{formatDateBR(t.occurredAt)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-mono font-bold ${t.direction === 'in' ? GREEN_TEXT : 'text-red-400'}`}>
                    {t.direction === 'in' ? '+' : '-'}R$ {formatCurrency(t.amount)}
                  </p>
                  <p className="text-[10px] text-[#A8A29A] font-mono">saldo: R$ {formatCurrency(t.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
