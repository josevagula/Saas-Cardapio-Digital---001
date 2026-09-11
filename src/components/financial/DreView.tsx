import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { DreBreakdown, DrePeriodType, Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { fetchRevenues, fetchExpenses, fetchLoyaltyRedemptionsTotal, fetchFinanceSettings, saveFinanceSettings, saveDreSnapshot } from '../../lib/workspaceRepo';
import { periodRange, shiftPeriod, periodLabel, CARD_CLASS } from './financeShared';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Save, TrendingUp, TrendingDown } from 'lucide-react';

async function computeBreakdown(userId: string, range: { start: string; end: string }, ordersById: Map<string, Order>, cogsPercent: number): Promise<DreBreakdown> {
  const [revenues, expenses, redemptions] = await Promise.all([
    fetchRevenues(userId, range),
    fetchExpenses(userId, range),
    fetchLoyaltyRedemptionsTotal(userId, range)
  ]);

  let receitaBruta = 0;
  let descontos = 0;
  let cupons = 0;
  revenues.forEach(r => {
    let gross = r.amount;
    if (r.origin === 'pedido_automatico' && r.orderId) {
      const order = ordersById.get(r.orderId);
      const discount = order?.discountAmount ?? 0;
      gross += discount;
      if (discount > 0) {
        if (order?.couponCode) cupons += discount; else descontos += discount;
      }
    }
    receitaBruta += gross;
  });

  const cashback = 0; // recurso não existe no Zushy hoje — ver Contexto do plano.
  const beneficiosFidelidade = redemptions;
  const receitaLiquida = receitaBruta - descontos - cupons - cashback - beneficiosFidelidade;
  const custos = (receitaLiquida * cogsPercent) / 100;
  const lucroBruto = receitaLiquida - custos;
  const despesasOperacionais = expenses.filter(e => e.category !== 'impostos').reduce((s, e) => s + e.amount, 0);
  const resultadoOperacional = lucroBruto - despesasOperacionais;
  const impostos = expenses.filter(e => e.category === 'impostos').reduce((s, e) => s + e.amount, 0);
  const lucroLiquido = resultadoOperacional - impostos;

  return { receitaBruta, descontos, cupons, cashback, beneficiosFidelidade, receitaLiquida, custos, lucroBruto, despesasOperacionais, resultadoOperacional, impostos, lucroLiquido };
}

const LINES: { key: keyof DreBreakdown; label: string; sign: '' | '-' | '='; bold?: boolean }[] = [
  { key: 'receitaBruta', label: 'Receita Bruta', sign: '' },
  { key: 'descontos', label: 'Descontos', sign: '-' },
  { key: 'cupons', label: 'Cupons', sign: '-' },
  { key: 'cashback', label: 'Cashback', sign: '-' },
  { key: 'beneficiosFidelidade', label: 'Benefícios Fidelidade', sign: '-' },
  { key: 'receitaLiquida', label: 'Receita Líquida', sign: '=', bold: true },
  { key: 'custos', label: 'Custos', sign: '-' },
  { key: 'lucroBruto', label: 'Lucro Bruto', sign: '=', bold: true },
  { key: 'despesasOperacionais', label: 'Despesas Operacionais', sign: '-' },
  { key: 'resultadoOperacional', label: 'Resultado Operacional', sign: '=', bold: true },
  { key: 'impostos', label: 'Impostos', sign: '-' },
  { key: 'lucroLiquido', label: 'Lucro Líquido', sign: '=', bold: true }
];

export default function DreView() {
  const { isDemoMode, orders } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [periodType, setPeriodType] = useState<DrePeriodType>('mensal');
  const [referenceISO, setReferenceISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [cogsPercent, setCogsPercent] = useState(35);
  const [breakdown, setBreakdown] = useState<DreBreakdown | null>(null);
  const [previous, setPrevious] = useState<DreBreakdown | null>(null);
  const [trend, setTrend] = useState<{ period: string; lucro: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordersById = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const range = useMemo(() => periodRange(periodType, referenceISO), [periodType, referenceISO]);

  useEffect(() => {
    if (!userId || isDemoMode) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const settings = await fetchFinanceSettings(userId);
        if (cancelled) return;
        setCogsPercent(settings.cogsPercent);

        const prevRef = shiftPeriod(periodType, referenceISO, -1);
        const prevRange = periodRange(periodType, prevRef);
        const [current, prev] = await Promise.all([
          computeBreakdown(userId, range, ordersById, settings.cogsPercent),
          computeBreakdown(userId, prevRange, ordersById, settings.cogsPercent)
        ]);
        if (cancelled) return;
        setBreakdown(current);
        setPrevious(prev);

        const trendPoints: { period: string; lucro: number }[] = [];
        let ref = referenceISO;
        for (let i = 0; i < 6; i++) {
          const r = periodRange(periodType, ref);
          const b = i === 0 ? current : await computeBreakdown(userId, r, ordersById, settings.cogsPercent);
          trendPoints.unshift({ period: periodLabel(periodType, ref), lucro: b.lucroLiquido });
          ref = shiftPeriod(periodType, ref, -1);
        }
        if (!cancelled) setTrend(trendPoints);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, isDemoMode, periodType, referenceISO, ordersById, range]);

  const saveCogs = async (value: number) => {
    if (!userId) return;
    setCogsPercent(value);
    try {
      const settings = await fetchFinanceSettings(userId);
      await saveFinanceSettings(userId, { ...settings, cogsPercent: value });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClosePeriod = async () => {
    if (!userId || !breakdown) return;
    setSaving(true);
    try {
      await saveDreSnapshot(userId, periodType, range.start, range.end, breakdown);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isDemoMode) {
    return <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4">Modo demonstração: a DRE fica disponível assim que você entrar com sua conta real.</div>;
  }

  const delta = breakdown && previous && previous.lucroLiquido !== 0
    ? ((breakdown.lucroLiquido - previous.lucroLiquido) / Math.abs(previous.lucroLiquido)) * 100
    : null;

  return (
    <div className="space-y-6">
      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">{error}</div>}

      <div className={`${CARD_CLASS} flex flex-wrap items-center gap-3`}>
        <select value={periodType} onChange={e => setPeriodType(e.target.value as DrePeriodType)} className="px-3 py-2 text-xs input-sushi">
          <option value="mensal">Mensal</option>
          <option value="trimestral">Trimestral</option>
          <option value="anual">Anual</option>
        </select>
        <button onClick={() => setReferenceISO(shiftPeriod(periodType, referenceISO, -1))} className="p-2 border border-[#2A211A] rounded-lg text-slate-300 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-display font-bold text-[#F5F0EA] capitalize min-w-[160px] text-center">{periodLabel(periodType, referenceISO)}</span>
        <button onClick={() => setReferenceISO(shiftPeriod(periodType, referenceISO, 1))} className="p-2 border border-[#2A211A] rounded-lg text-slate-300 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-[10px] font-semibold text-slate-400">Custo de Insumos (%)</label>
          <input type="number" value={cogsPercent} onChange={e => saveCogs(parseFloat(e.target.value) || 0)} className="w-16 px-2 py-1.5 text-xs input-sushi font-mono" />
        </div>
        <button onClick={handleClosePeriod} disabled={saving || !breakdown} className="flex items-center gap-1.5 px-4 py-2 btn-sushi-primary text-white text-xs font-bold cursor-pointer disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Salvando...' : 'Fechar Período'}
        </button>
      </div>

      {loading || !breakdown ? (
        <p className="text-xs text-[#A8A29A]">Calculando DRE...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 ${CARD_CLASS}`}>
            <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] mb-4 border-b border-[#2A211A] pb-3">Demonstrativo de Resultado</h3>
            <div className="space-y-1">
              {LINES.map(line => (
                <div key={line.key} className={`flex items-center justify-between py-1.5 ${line.bold ? 'border-t border-[#2A211A] mt-1 pt-2' : ''}`}>
                  <span className={`text-xs ${line.bold ? 'font-bold text-[#F5F0EA]' : 'text-slate-300'}`}>
                    {line.sign === '-' ? '(-) ' : line.sign === '=' ? '= ' : ''}{line.label}
                  </span>
                  <span className={`text-xs font-mono ${line.bold ? 'font-extrabold' : ''} ${line.sign === '-' && breakdown[line.key] > 0 ? 'text-red-400' : breakdown[line.key] < 0 ? 'text-red-400' : 'text-white'}`}>
                    {line.sign === '-' && breakdown[line.key] !== 0 ? '- ' : ''}R$ {formatCurrency(Math.abs(breakdown[line.key]))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <h4 className="text-xs font-mono text-[#FB923C] uppercase tracking-widest font-bold">Comparativo vs. período anterior</h4>
              {delta !== null ? (
                <div className={`flex items-center gap-2 mt-3 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {delta >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span className="text-lg font-display font-extrabold">{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</span>
                </div>
              ) : <p className="text-xs text-[#A8A29A] mt-2">Sem base de comparação.</p>}
              <p className="text-[10px] text-[#A8A29A] mt-2">Lucro líquido anterior: R$ {previous ? formatCurrency(previous.lucroLiquido) : '0,00'}</p>
            </div>

            <div className={CARD_CLASS}>
              <h4 className="text-xs font-mono text-[#FB923C] uppercase tracking-widest font-bold mb-3">Tendência (Lucro Líquido)</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A211A" />
                    <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#A8A29A' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#A8A29A' }} />
                    <Tooltip contentStyle={{ background: '#141210', border: '1px solid #2A211A', fontSize: 11 }} />
                    <Line type="monotone" dataKey="lucro" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
