import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import {
  FILTER_PRESETS,
  FilterPreset,
  rangeForPreset,
  computeTicketMedioBreakdown,
  ticketMedioHistory,
  computeRecompraBreakdown,
  recompraHistory,
  computeClientesAtivos,
  computeClientesInativos,
  computeLtv,
  computeVipRanking,
  historyForRange
} from '../../utils/analyticsStats';
import { CARD_CLASS, VIP_TIER_BADGE_CLASS, formatChangePercent, changeColorClass } from './analyticsShared';
import { ClientesAtivosTable, ClientesInativosTable, VipRankingTable } from './AnalyticsTables';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  BarChart3, Receipt, Repeat, UserCheck, UserX, Gem, Crown, TrendingUp
} from 'lucide-react';

const TOOLTIP_STYLE = { backgroundColor: '#141210', borderRadius: '12px', color: '#F5F0EA', border: '1px solid #2A211A', fontSize: '11px', padding: '8px 12px' };

export default function AdvancedAnalytics() {
  const { orders, customers } = useApp();

  const [filterPreset, setFilterPreset] = useState<FilterPreset>('30d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const pointsByPhone = useMemo(() => {
    const map: Record<string, number> = {};
    customers.forEach(c => { map[c.phone] = c.loyaltyPoints; });
    return map;
  }, [customers]);

  // Fixed-definition metrics (Ticket Médio's own multi-window breakdown,
  // Taxa de Recompra's own windows, Clientes Ativos/Inativos, LTV, VIP) are
  // defined by their own formulas in the spec and don't move with the
  // global filter below — only the history charts at the bottom do.
  const ticketBreakdown = useMemo(() => computeTicketMedioBreakdown(orders), [orders]);
  const ticketHistory = useMemo(() => ticketMedioHistory(orders, 30), [orders]);
  const recompraBreakdown = useMemo(() => computeRecompraBreakdown(orders), [orders]);
  const recompraTrend = useMemo(() => recompraHistory(orders, 6), [orders]);
  const ativos = useMemo(() => computeClientesAtivos(orders), [orders]);
  const inativos = useMemo(() => computeClientesInativos(orders), [orders]);
  const ltv = useMemo(() => computeLtv(orders, 6), [orders]);
  const vipRanking = useMemo(() => computeVipRanking(orders, pointsByPhone), [orders, pointsByPhone]);

  const globalRange = useMemo(
    () => rangeForPreset(filterPreset, { start: customStart, end: customEnd }),
    [filterPreset, customStart, customEnd]
  );
  const globalHistory = useMemo(() => historyForRange(orders, globalRange), [orders, globalRange]);
  const globalRevenueTotal = useMemo(() => globalHistory.reduce((s, d) => s + d.revenue, 0), [globalHistory]);
  const globalOrdersTotal = useMemo(() => globalHistory.reduce((s, d) => s + d.orders, 0), [globalHistory]);

  const vipTierCounts = useMemo(() => {
    const counts: Record<string, number> = { Diamante: 0, Ouro: 0, Prata: 0, Bronze: 0 };
    vipRanking.forEach(r => { counts[r.tier] += 1; });
    return counts;
  }, [vipRanking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-advanced-analytics">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-mono font-semibold text-[#FB923C] uppercase tracking-widest flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Business Intelligence
          </span>
          <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">Analytics Avançado</h2>
          <p className="text-sm text-[#A8A29A] mt-1">Ticket médio, recompra, retenção, LTV e ranking VIP — calculados direto dos seus pedidos reais.</p>
        </div>
      </div>

      {/* Global Filters */}
      <div className="bg-[#141210] p-3 rounded-xl border border-[#2A211A] shadow-xs mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {FILTER_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterPreset(p.id)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                filterPreset === p.id
                  ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shadow-sm'
                  : 'text-[#A8A29A] hover:text-white hover:bg-[#181512]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {filterPreset === 'personalizado' && (
          <div className="flex flex-wrap items-center gap-3 mt-3 p-3 bg-[#181512] rounded-lg border border-[#2A211A]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#A8A29A] uppercase font-mono font-bold">Início:</span>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ colorScheme: 'dark' }}
                className="px-2 py-1 text-xs bg-[#0C0A08] border border-[#2A211A] rounded-md focus:outline-none focus:border-[#FB923C] text-white cursor-pointer" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#A8A29A] uppercase font-mono font-bold">Fim:</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ colorScheme: 'dark' }}
                className="px-2 py-1 text-xs bg-[#0C0A08] border border-[#2A211A] rounded-md focus:outline-none focus:border-[#FB923C] text-white cursor-pointer" />
            </div>
          </div>
        )}
      </div>

      {/* Row 1: Ticket Médio, Taxa de Recompra, Clientes Ativos, Clientes Inativos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6 items-stretch">
        {/* Ticket Médio */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-display font-extrabold text-[#F5F0EA] flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#FB923C]" />
              Ticket Médio
            </h3>
          </div>
          <div className="space-y-2">
            {ticketBreakdown.map(stat => (
              <div key={stat.key} className="flex items-center justify-between text-[11px]">
                <span className="text-[#A8A29A] font-semibold">{stat.label}</span>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#F5F0EA]">R$ {formatCurrency(stat.value)}</span>
                  <span className={`ml-1.5 font-mono text-[10px] ${changeColorClass(stat.changePercent)}`}>{formatChangePercent(stat.changePercent)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Taxa de Recompra */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-display font-extrabold text-[#F5F0EA] flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-[#FB923C]" />
              Taxa de Recompra
            </h3>
          </div>
          <div className="space-y-2">
            {recompraBreakdown.map(stat => (
              <div key={stat.key} className="flex items-center justify-between text-[11px]">
                <span className="text-[#A8A29A] font-semibold">{stat.label}</span>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#F5F0EA]">{stat.value}%</span>
                  <span className={`ml-1.5 font-mono text-[10px] ${changeColorClass(stat.changePercent)}`}>{formatChangePercent(stat.changePercent)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-display font-extrabold text-[#F5F0EA] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#FB923C]" />
              Clientes Ativos
            </h3>
          </div>
          <p className="text-2xl font-display font-black text-[#F5F0EA] font-mono">{ativos.total}</p>
          <p className="text-[10px] text-[#A8A29A] mt-1">Pedido nos últimos 30 dias</p>
          <div className="mt-3 pt-3 border-t border-[#2A211A] space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#A8A29A]">Crescimento (30d)</span>
              <span className={`font-mono font-bold ${changeColorClass(ativos.crescimento)}`}>{formatChangePercent(ativos.crescimento)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A8A29A]">Novos ativos</span>
              <span className="font-mono font-bold text-[#F5F0EA]">{ativos.novos}</span>
            </div>
          </div>
        </div>

        {/* Clientes Inativos */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-display font-extrabold text-[#F5F0EA] flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-[#FB923C]" />
              Clientes Inativos
            </h3>
          </div>
          <p className="text-2xl font-display font-black text-[#F5F0EA] font-mono">{inativos.length}</p>
          <p className="text-[10px] text-[#A8A29A] mt-1">Sem pedido há 31+ dias</p>
          <div className="mt-3 pt-3 border-t border-[#2A211A] space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-amber-300">Leve (31-60d)</span>
              <span className="font-mono font-bold text-[#F5F0EA]">{inativos.filter(c => c.tier === 'Leve').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-300">Médio (61-120d)</span>
              <span className="font-mono font-bold text-[#F5F0EA]">{inativos.filter(c => c.tier === 'Médio').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-300">Grave (121d+)</span>
              <span className="font-mono font-bold text-[#F5F0EA]">{inativos.filter(c => c.tier === 'Grave').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: LTV Médio, Clientes VIP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* LTV */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-[#FB923C]" />
              Lifetime Value (LTV) Médio
            </h3>
          </div>
          <p className="text-[11px] text-[#A8A29A] mb-3">Ticket médio × frequência × tempo médio de relacionamento (médias da base).</p>
          <p className="text-2xl font-display font-black text-[#F5F0EA] font-mono mb-4">R$ {formatCurrency(ltv.avgLtv)}</p>

          <div className="h-32 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ltv.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A211A" />
                <XAxis dataKey="date" stroke="#8A7E72" fontSize={10} tickLine={false} />
                <YAxis stroke="#8A7E72" fontSize={10} tickLine={false} width={30} />
                <Tooltip formatter={(val: any) => [`R$ ${formatCurrency(val)}`, 'LTV Médio']} contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="avgLtv" stroke="#F97316" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold mb-2">Top Clientes por LTV</p>
          <div className="divide-y divide-[#2A211A]">
            {ltv.top.slice(0, 5).map((c, idx) => (
              <div key={c.phone} className="py-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-semibold truncate">#{idx + 1} {c.name}</span>
                <span className="font-mono font-bold text-[#FB923C]">R$ {formatCurrency(c.ltv)}</span>
              </div>
            ))}
            {ltv.top.length === 0 && <p className="text-[11px] text-[#A8A29A] py-2">Sem pedidos suficientes ainda.</p>}
          </div>
        </div>

        {/* Clientes VIP */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-display font-extrabold text-[#F5F0EA] flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-[#FB923C]" />
              Clientes VIP
            </h3>
          </div>
          <p className="text-[11px] text-[#A8A29A] mb-3">Score: 40% gasto total + 25% pedidos + 20% frequência + 15% pontos.</p>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {(['Diamante', 'Ouro', 'Prata', 'Bronze'] as const).map(tier => (
              <div key={tier} className="text-center p-2.5 rounded-xl bg-[#181512] border border-[#2A211A]">
                <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${VIP_TIER_BADGE_CLASS[tier]}`}>{tier}</span>
                <p className="text-lg font-display font-black text-[#F5F0EA] font-mono">{vipTierCounts[tier]}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold mb-2">Top 5 Ranking</p>
          <div className="divide-y divide-[#2A211A]">
            {vipRanking.slice(0, 5).map(c => (
              <div key={c.phone} className="py-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 shrink-0 rounded-md bg-[#1F1209] border border-[#4A2A10] text-[#FB923C] font-mono font-bold text-[10px] flex items-center justify-center">{c.position}</span>
                  <span className="text-slate-200 font-semibold truncate">{c.name}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${VIP_TIER_BADGE_CLASS[c.tier]}`}>{c.tier}</span>
                </div>
                <span className="font-mono font-bold text-[#F97316] shrink-0">{c.score}</span>
              </div>
            ))}
            {vipRanking.length === 0 && <p className="text-[11px] text-[#A8A29A] py-2">Sem pedidos suficientes ainda.</p>}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Global-filter-driven revenue evolution */}
        <div className="lg:col-span-2 bg-[#141210] p-5 rounded-xl border border-[#2A211A] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-display font-bold text-[#F5F0EA]">Evolução no Período Selecionado</h4>
              <p className="text-[11px] text-[#A8A29A] mt-0.5">Responde ao filtro global acima ({FILTER_PRESETS.find(p => p.id === filterPreset)?.label})</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-[#FB923C] font-mono">R$ {formatCurrency(globalRevenueTotal)}</p>
              <p className="text-[10px] text-[#A8A29A]">{globalOrdersTotal} pedidos</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalHistory}>
                <defs>
                  <linearGradient id="analyticsRevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#C2410C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A211A" />
                <XAxis dataKey="date" stroke="#8A7E72" fontSize={11} tickLine={false} />
                <YAxis stroke="#8A7E72" fontSize={11} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(val: any) => [`R$ ${formatCurrency(val)}`, 'Faturamento']} contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsRevGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket Médio evolution */}
        <div className="bg-[#141210] p-5 rounded-xl border border-[#2A211A] shadow-sm">
          <h4 className="text-sm font-display font-bold text-[#F5F0EA] mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#FB923C]" />
            Evolução do Ticket Médio (30 dias)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketHistory}>
                <defs>
                  <linearGradient id="analyticsTicketGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FB923C" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FB923C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A211A" />
                <XAxis dataKey="date" stroke="#8A7E72" fontSize={10} tickLine={false} />
                <YAxis stroke="#8A7E72" fontSize={10} tickLine={false} width={30} />
                <Tooltip formatter={(val: any) => [`R$ ${formatCurrency(val)}`, 'Ticket Médio']} contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="amount" stroke="#FB923C" strokeWidth={2} fillOpacity={1} fill="url(#analyticsTicketGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Taxa de Recompra evolution */}
        <div className="bg-[#141210] p-5 rounded-xl border border-[#2A211A] shadow-sm">
          <h4 className="text-sm font-display font-bold text-[#F5F0EA] mb-4 flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-[#FB923C]" />
            Evolução da Taxa de Recompra (6 meses)
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recompraTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A211A" />
                <XAxis dataKey="date" stroke="#8A7E72" fontSize={10} tickLine={false} />
                <YAxis stroke="#8A7E72" fontSize={10} tickLine={false} width={30} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(val: any) => [`${val}%`, 'Taxa de Recompra']} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="rate" fill="#F97316" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="space-y-6">
        <ClientesAtivosTable rows={ativos.rows} />
        <ClientesInativosTable rows={inativos} />
        <VipRankingTable rows={vipRanking} />
      </div>
    </div>
  );
}
