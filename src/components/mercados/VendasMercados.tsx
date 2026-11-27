import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ShoppingBag, Receipt, Wallet, CheckCircle2, BarChart3, Store, Plus } from 'lucide-react';
import { Mercado, vendasPorDia, vendasPorMercado } from '../../lib/mercadosRepo';
import { brl, dataBR, hojeISO } from './mercadosShared';
import { BTN_PRIMARY, CARD, EmptyState, INPUT, LABEL, Spinner } from './ui';
import type { Notify } from '../MercadosManager';

// "Vendas": quanto foi vendido aos mercados no período e como está andando
// (comparado ao período anterior de mesmo tamanho). Tudo agregado no banco
// (vendas_mercados_por_dia / _por_mercado). Todo pedido conta como vendido.

type Preset = '7d' | '30d' | 'mes' | 'mes_passado' | 'ano' | 'custom';
const PRESETS: { id: Preset; label: string }[] = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'ano', label: 'Este ano' },
  { id: 'custom', label: 'Personalizado' }
];

const BAR_COLOR = '#EA580C';
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diasEntre = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000) + 1;

function rangeFor(p: Preset, custom: { inicio: string; fim: string }): { inicio: string; fim: string } {
  const hoje = hojeISO();
  const t = parse(hoje);
  switch (p) {
    case '7d': return { inicio: addDays(hoje, -6), fim: hoje };
    case '30d': return { inicio: addDays(hoje, -29), fim: hoje };
    case 'mes': return { inicio: iso(new Date(t.getFullYear(), t.getMonth(), 1)), fim: hoje };
    case 'mes_passado': return { inicio: iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), fim: iso(new Date(t.getFullYear(), t.getMonth(), 0)) };
    case 'ano': return { inicio: iso(new Date(t.getFullYear(), 0, 1)), fim: hoje };
    default: return custom.inicio <= custom.fim ? custom : { inicio: custom.fim, fim: custom.inicio };
  }
}

export default function VendasMercados({ mercados, onCadastrar, notify }: { mercados: Mercado[]; onCadastrar: () => void; notify: Notify }) {
  const [preset, setPreset] = useState<Preset>('30d');
  const [custom, setCustom] = useState({ inicio: addDays(hojeISO(), -29), fim: hojeISO() });
  const range = useMemo(() => rangeFor(preset, custom), [preset, custom]);
  const dias = diasEntre(range.inicio, range.fim);
  // Período anterior de mesmo tamanho, logo antes (comparação "como está andando").
  const anterior = useMemo(() => ({ inicio: addDays(range.inicio, -dias), fim: addDays(range.inicio, -1) }), [range, dias]);

  const [porDia, setPorDia] = useState<{ data: string; total: number; pedidos: number }[]>([]);
  const [porMercado, setPorMercado] = useState<{ mercado_id: number; total: number; pago: number; pedidos: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([vendasPorDia(anterior.inicio, range.fim), vendasPorMercado(range.inicio, range.fim)])
      .then(([d, m]) => { if (!cancel) { setPorDia(d); setPorMercado(m); } })
      .catch(e => !cancel && notify(e.message, 'erro'))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [range, anterior, notify]);

  const atual = useMemo(() => porDia.filter(d => d.data >= range.inicio), [porDia, range]);
  const prev = useMemo(() => porDia.filter(d => d.data < range.inicio), [porDia, range]);
  const total = atual.reduce((s, d) => s + d.total, 0);
  const pedidos = atual.reduce((s, d) => s + d.pedidos, 0);
  const totalPrev = prev.reduce((s, d) => s + d.total, 0);
  const pago = porMercado.reduce((s, m) => s + m.pago, 0);
  const emAberto = total - pago;
  const variacao = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : null;
  const mediaDia = total / dias;

  // Por dia até ~2 meses; acima disso, por mês (fica legível no celular).
  const porMes = dias > 62;
  const serie = useMemo(() => {
    const mapa = new Map(atual.map(d => [d.data, d.total]));
    const out: { label: string; total: number; title: string }[] = [];
    if (!porMes) {
      for (let i = 0; i < dias; i++) {
        const k = addDays(range.inicio, i);
        out.push({ label: `${k.slice(8, 10)}/${k.slice(5, 7)}`, total: (mapa.get(k) ?? 0) / 100, title: dataBR(k) });
      }
    } else {
      const meses = new Map<string, number>();
      const ini = parse(range.inicio);
      const fim = parse(range.fim);
      for (let d = new Date(ini.getFullYear(), ini.getMonth(), 1); d <= fim; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        meses.set(iso(d).slice(0, 7), 0);
      }
      atual.forEach(d => meses.set(d.data.slice(0, 7), (meses.get(d.data.slice(0, 7)) ?? 0) + d.total));
      meses.forEach((v, k) => {
        const [y, m] = k.split('-').map(Number);
        out.push({ label: `${MESES[m - 1]}/${String(y).slice(2)}`, total: v / 100, title: `${MESES[m - 1]} de ${y}` });
      });
    }
    return out;
  }, [atual, porMes, dias, range]);

  const melhor = serie.reduce<{ label: string; total: number; title: string } | null>((b, s) => (s.total > 0 && (!b || s.total > b.total) ? s : b), null);
  const nomes = useMemo(() => new Map(mercados.map(m => [m.id, `${m.nome}${m.cidade ? ` - ${m.cidade}` : ''}`])), [mercados]);

  if (mercados.length === 0) {
    return (
      <EmptyState icon={Store} title="Nenhum mercado cadastrado ainda" text="Cadastre um mercado e lance pedidos para acompanhar aqui quanto você está vendendo."
        action={<button className={BTN_PRIMARY} onClick={onCadastrar}><Plus className="w-4 h-4" /> Cadastrar primeiro mercado</button>} />
    );
  }

  const Trend = variacao == null ? Minus : variacao >= 0 ? TrendingUp : TrendingDown;
  const trendColor = variacao == null ? 'text-[#A8A29A]' : variacao >= 0 ? 'text-[#86EFAC]' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Período */}
      <div className={`${CARD} p-3`}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => setPreset(p.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                preset === p.id ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shadow-sm' : 'text-[#A8A29A] hover:text-white hover:bg-[#181512]'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><label className={LABEL}>De</label><input type="date" value={custom.inicio} onChange={e => setCustom(c => ({ ...c, inicio: e.target.value }))} className={INPUT} /></div>
            <div><label className={LABEL}>Até</label><input type="date" value={custom.fim} onChange={e => setCustom(c => ({ ...c, fim: e.target.value }))} className={INPUT} /></div>
          </div>
        )}
        <p className="text-[11px] text-[#A8A29A] font-mono mt-2 px-1">{dataBR(range.inicio)} a {dataBR(range.fim)} · {dias} {dias === 1 ? 'dia' : 'dias'}</p>
      </div>

      {/* Número principal + comparação */}
      <div className={`${CARD} p-5 sm:p-6 ${loading ? 'opacity-60' : ''}`}>
        <p className="text-xs font-semibold text-[#A8A29A]">Vendido para mercados no período</p>
        <p className="text-4xl sm:text-5xl font-display font-extrabold text-[#F5F0EA] font-mono mt-1 break-words">{brl(total)}</p>
        <div className={`flex items-center gap-1.5 mt-2 text-sm font-semibold ${trendColor}`}>
          <Trend className="w-4 h-4" />
          {variacao == null
            ? <span>{total > 0 ? 'Sem vendas no período anterior para comparar' : 'Nenhuma venda no período'}</span>
            : <span>{variacao >= 0 ? '+' : ''}{variacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs período anterior <span className="text-[#A8A29A] font-normal">({brl(totalPrev)})</span></span>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Pedidos', value: String(pedidos), sub: `${(pedidos / dias).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por dia`, icon: ShoppingBag },
          { label: 'Média por pedido', value: brl(pedidos ? Math.round(total / pedidos) : 0), sub: 'Valor médio de cada pedido', icon: Receipt },
          { label: 'Média por dia', value: brl(Math.round(mediaDia)), sub: melhor ? `Melhor ${porMes ? 'mês' : 'dia'}: ${melhor.title}` : 'Sem vendas ainda', icon: BarChart3 },
          { label: 'Já recebido', value: brl(pago), sub: emAberto > 0 ? `${brl(emAberto)} ainda não pago` : total > 0 ? 'Tudo pago' : '—', icon: emAberto > 0 ? Wallet : CheckCircle2 }
        ].map(c => (
          <div key={c.label} className={`${CARD} p-4 ${loading ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#A8A29A]">{c.label}</span>
              <c.icon className="w-4 h-4 text-[#FB923C]" />
            </div>
            <p className="text-lg sm:text-xl font-extrabold font-mono text-[#F5F0EA] truncate">{c.value}</p>
            <p className="text-[11px] text-[#A8A29A] mt-0.5 truncate">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Evolução */}
      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h3 className="font-display font-bold text-[#F5F0EA]">Vendas por {porMes ? 'mês' : 'dia'}</h3>
          {loading && <Spinner className="w-4 h-4 text-[#A8A29A]" />}
        </div>
        {total === 0 && !loading ? (
          <p className="text-sm text-[#A8A29A] text-center py-12">Nenhuma venda para mercados neste período.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A211A" />
                <XAxis dataKey="label" stroke="#8A7E72" fontSize={11} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                <YAxis stroke="#8A7E72" fontSize={11} tickLine={false} width={64}
                  tickFormatter={v => (v >= 1000 ? `R$${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : `R$${v}`)} />
                <Tooltip
                  cursor={{ fill: '#2A211A', opacity: 0.5 }}
                  formatter={(v: any) => [(Number(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Vendido']}
                  labelFormatter={(_l: any, p: any) => p?.[0]?.payload?.title ?? _l}
                  contentStyle={{ backgroundColor: '#141210', borderRadius: '12px', color: '#F5F0EA', border: '1px solid #2A211A', fontSize: '12px', padding: '8px 12px' }}
                />
                <Bar dataKey="total" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Por mercado */}
      <div className={`${CARD} p-4 sm:p-5`}>
        <h3 className="font-display font-bold text-[#F5F0EA] mb-3">Por mercado</h3>
        {porMercado.length === 0 ? (
          <p className="text-sm text-[#A8A29A] text-center py-6">Nenhuma venda no período.</p>
        ) : (
          <ul className="space-y-3">
            {porMercado.map(m => {
              const pct = total > 0 ? (m.total / total) * 100 : 0;
              return (
                <li key={m.mercado_id}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-sm text-slate-200 min-w-0 truncate">{nomes.get(m.mercado_id) ?? 'Mercado'}</span>
                    <span className="text-sm font-mono font-bold text-[#F5F0EA] shrink-0">{brl(m.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#2A211A] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: BAR_COLOR }} />
                  </div>
                  <p className="text-[11px] text-[#A8A29A] mt-1 font-mono">
                    {pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% · {m.pedidos} {m.pedidos === 1 ? 'pedido' : 'pedidos'}
                    {m.total - m.pago > 0 ? ` · ${brl(m.total - m.pago)} não pago` : ' · pago'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
