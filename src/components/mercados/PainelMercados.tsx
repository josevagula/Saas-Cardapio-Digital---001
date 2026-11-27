import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, Calendar, Wallet, ClipboardList, Factory, Trophy, Package, Store, Plus, RefreshCw } from 'lucide-react';
import { getResumo, Mercado, ResumoMercados } from '../../lib/mercadosRepo';
import { brl, dataBR, hojeISO } from './mercadosShared';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, EmptyState, Spinner } from './ui';
import type { Notify } from '../MercadosManager';

interface Props {
  mercados: Mercado[];
  loadingMercados: boolean;
  onCadastrar: () => void;
  onLancar: () => void;
  notify: Notify;
}

const ZERO: ResumoMercados = {
  dia: 0, semana: 0, mes: 0, pedidos_dia: 0, pedidos_mes: 0, a_receber: 0,
  devendo: [], producao_dia: [], ranking_mercados: [], ranking_produtos: []
};

export default function PainelMercados({ mercados, loadingMercados, onCadastrar, onLancar, notify }: Props) {
  const [resumo, setResumo] = useState<ResumoMercados>(ZERO);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const hoje = hojeISO();

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getResumo(hoje)
      .then(r => !cancel && setResumo(r))
      .catch(e => !cancel && notify(e.message, 'erro'))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [hoje, reload, notify]);

  const nomeMercado = useMemo(() => {
    const map = new Map(mercados.map(m => [m.id, m]));
    return (id: number) => {
      const m = map.get(id);
      return m ? `${m.nome}${m.cidade ? ` - ${m.cidade}` : ''}` : 'Mercado';
    };
  }, [mercados]);

  if (!loadingMercados && mercados.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="Comece cadastrando um mercado"
        text="Cadastre os supermercados para quem você vende, os produtos e preços de cada um, e lance os pedidos tão rápido quanto na planilha."
        action={<button className={BTN_PRIMARY} onClick={onCadastrar}><Plus className="w-4 h-4" /> Cadastrar primeiro mercado</button>}
      />
    );
  }

  const cards = [
    { label: 'Vendido hoje', value: brl(resumo.dia), sub: `${resumo.pedidos_dia} ${resumo.pedidos_dia === 1 ? 'pedido' : 'pedidos'}`, icon: CalendarDays },
    { label: 'Na semana', value: brl(resumo.semana), sub: 'Desde segunda-feira', icon: CalendarRange },
    { label: 'No mês', value: brl(resumo.mes), sub: `${resumo.pedidos_mes} ${resumo.pedidos_mes === 1 ? 'pedido' : 'pedidos'}`, icon: Calendar },
    { label: 'A receber', value: brl(resumo.a_receber), sub: 'Entregues e não pagos', icon: Wallet, accent: true }
  ];

  const maxMercado = Math.max(1, ...resumo.ranking_mercados.map(r => r.total));
  const maxProduto = Math.max(1, ...resumo.ranking_produtos.map(r => r.qtd));
  const totalProducao = resumo.producao_dia.reduce((s, p) => s + p.qtd, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#A8A29A] font-mono">Hoje, {dataBR(hoje)}</p>
        <div className="flex gap-2">
          <button className={BTN_SECONDARY} onClick={() => setReload(r => r + 1)} disabled={loading}>
            {loading ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />} Atualizar
          </button>
          <button className={BTN_PRIMARY} onClick={onLancar}><ClipboardList className="w-4 h-4" /> Lançar pedido</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(c => (
          <div key={c.label} className={`${CARD} p-4 sm:p-5 ${c.accent && resumo.a_receber > 0 ? 'border-[#FDE047]/30' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#A8A29A]">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.accent ? 'text-[#FDE047]' : 'text-[#FB923C]'}`} />
            </div>
            <p className={`text-lg sm:text-2xl font-display font-extrabold font-mono truncate ${loading ? 'opacity-40' : ''} ${c.accent && resumo.a_receber > 0 ? 'text-[#FDE047]' : 'text-[#F5F0EA]'}`}>{c.value}</p>
            <p className="text-[11px] text-[#A8A29A] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Produção do dia */}
      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-display font-bold text-[#F5F0EA] flex items-center gap-2"><Factory className="w-4 h-4 text-[#FB923C]" /> Produção do dia</h3>
          {totalProducao > 0 && <span className="text-xs font-mono text-[#A8A29A]">{totalProducao} un. no total</span>}
        </div>
        {resumo.producao_dia.length === 0 ? (
          <p className="text-sm text-[#A8A29A] py-4 text-center">Nenhum pedido de mercado para hoje. Quando houver, aqui aparece quanto produzir de cada produto, somando todos os mercados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {resumo.producao_dia.map(p => (
              <div key={p.nome} className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-[#0C0A08] border border-[#2A211A]">
                <span className="text-sm text-slate-200 min-w-0 break-words">{p.nome}</span>
                <span className="text-xl font-mono font-extrabold text-[#FB923C] shrink-0">{p.qtd}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Ranking
          titulo="Mercados que mais compram"
          icon={Trophy}
          vazio="Os mercados que mais compram no mês aparecem aqui."
          itens={resumo.ranking_mercados.map(r => ({ nome: nomeMercado(r.mercado_id), valor: brl(r.total), sub: `${r.pedidos} ${r.pedidos === 1 ? 'pedido' : 'pedidos'}`, pct: r.total / maxMercado }))}
        />
        <Ranking
          titulo="Produtos mais vendidos"
          icon={Package}
          vazio="Os produtos mais vendidos no mês aparecem aqui."
          itens={resumo.ranking_produtos.map(r => ({ nome: r.nome, valor: `${r.qtd} un.`, sub: brl(r.total), pct: r.qtd / maxProduto }))}
        />
      </div>
    </div>
  );
}

function Ranking({ titulo, icon: Icon, itens, vazio }: { titulo: string; icon: React.ComponentType<{ className?: string }>; itens: { nome: string; valor: string; sub: string; pct: number }[]; vazio: string }) {
  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <h3 className="font-display font-bold text-[#F5F0EA] flex items-center gap-2 mb-1"><Icon className="w-4 h-4 text-[#FB923C]" /> {titulo}</h3>
      <p className="text-[11px] text-[#A8A29A] mb-4">Mês atual</p>
      {itens.length === 0 ? (
        <p className="text-sm text-[#A8A29A] py-4 text-center">{vazio}</p>
      ) : (
        <ol className="space-y-3">
          {itens.map((it, i) => (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-sm text-slate-200 min-w-0 truncate"><span className="font-mono text-[#A8A29A] mr-2">{i + 1}º</span>{it.nome}</span>
                <span className="text-sm font-mono font-bold text-[#F5F0EA] shrink-0">{it.valor}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[#2A211A] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#C2410C] to-[#F97316]" style={{ width: `${Math.max(4, it.pct * 100)}%` }} />
                </div>
                <span className="text-[10px] font-mono text-[#A8A29A] shrink-0 w-24 text-right">{it.sub}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
