import React, { useEffect, useMemo, useState } from 'react';
import { History, Pencil, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, Wallet, Check, Truck, Clock } from 'lucide-react';
import {
  deletePedido, FORMAS_PAGAMENTO, formaLabel, getItens, getResumo, ItemPedido, listPedidos, Mercado, PedidoMercado,
  ResumoMercados, STATUS_LABELS, StatusPedido, updatePedidoStatus
} from '../../lib/mercadosRepo';
import { brl, dataBR, diasAtrasISO, hojeISO } from './mercadosShared';
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, CARD, EmptyState, ExportActions, INPUT, LABEL, PedidoTabela, Spinner } from './ui';
import type { Notify } from '../MercadosManager';

const PAGE_SIZE = 20;

// Literal hex: index.css remapeia emerald/blue do Tailwind para laranja.
export const STATUS_STYLE: Record<StatusPedido, string> = {
  0: 'bg-[#FDBA74]/15 text-[#FDBA74] border-[#FDBA74]/40',
  1: 'bg-[#FDE047]/15 text-[#FDE047] border-[#FDE047]/40',
  2: 'bg-[#86EFAC]/15 text-[#86EFAC] border-[#86EFAC]/40'
};
const STATUS_ICON: Record<StatusPedido, React.ComponentType<{ className?: string }>> = { 0: Clock, 1: Truck, 2: Check };

interface Props {
  mercados: Mercado[];
  onEditar: (id: number) => void;
  notify: Notify;
}

export default function HistoricoPedidos({ mercados, onEditar, notify }: Props) {
  const [mercadoId, setMercadoId] = useState<number | null>(null);
  const [inicio, setInicio] = useState(diasAtrasISO(30));
  const [fim, setFim] = useState(hojeISO());
  const [status, setStatus] = useState<StatusPedido | null>(null);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PedidoMercado[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [devendo, setDevendo] = useState<ResumoMercados['devendo']>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [itensCache, setItensCache] = useState<Record<number, ItemPedido[]>>({});
  const [pagando, setPagando] = useState<PedidoMercado | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  const porId = useMemo(() => new Map(mercados.map(m => [m.id, m])), [mercados]);

  useEffect(() => { setPage(0); }, [mercadoId, inicio, fim, status]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    listPedidos({ mercadoId, inicio, fim, status }, page, PAGE_SIZE)
      .then(r => { if (!cancel) { setRows(r.rows); setTotal(r.total); } })
      .catch(e => !cancel && notify(e.message, 'erro'))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [mercadoId, inicio, fim, status, page, reload, notify]);

  useEffect(() => {
    getResumo(hojeISO()).then(r => setDevendo(r.devendo)).catch(() => {});
  }, [reload]);

  const toggleVer = async (p: PedidoMercado) => {
    if (aberto === p.id) { setAberto(null); return; }
    setAberto(p.id);
    if (!itensCache[p.id]) {
      try {
        const itens = await getItens(p.id);
        setItensCache(prev => ({ ...prev, [p.id]: itens }));
      } catch (e: any) {
        notify(e.message, 'erro');
      }
    }
  };

  const mudarStatus = async (p: PedidoMercado, novo: StatusPedido) => {
    if (novo === 2) { setPagando(p); return; }
    setBusyId(p.id);
    try {
      await updatePedidoStatus(p.id, novo, null, null);
      notify(`Pedido marcado como ${STATUS_LABELS[novo]}.`);
      setReload(r => r + 1);
    } catch (e: any) {
      notify(e.message, 'erro');
    } finally {
      setBusyId(null);
    }
  };

  const excluir = async (p: PedidoMercado) => {
    const m = porId.get(p.mercado_id);
    if (!window.confirm(`Excluir o pedido de ${m?.nome ?? 'mercado'} do dia ${dataBR(p.data)} (${brl(p.total_centavos)})? Essa ação não pode ser desfeita.`)) return;
    setBusyId(p.id);
    try {
      await deletePedido(p.id);
      notify('Pedido excluído.');
      setReload(r => r + 1);
    } catch (e: any) {
      notify(e.message, 'erro');
    } finally {
      setBusyId(null);
    }
  };

  const paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalDevendo = devendo.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-5">
      {/* Em aberto por mercado (entregue e não pago) */}
      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-display font-bold text-[#F5F0EA] flex items-center gap-2"><Wallet className="w-4 h-4 text-[#FB923C]" /> A receber por mercado</h3>
          <span className="font-mono font-extrabold text-[#FDE047]">{brl(totalDevendo)}</span>
        </div>
        {devendo.length === 0 ? (
          <p className="text-sm text-[#A8A29A]">Nenhum valor em aberto. Pedidos entregues e ainda não pagos aparecem aqui.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {devendo.map(d => (
              <button key={d.mercado_id} onClick={() => { setMercadoId(d.mercado_id); setStatus(1); setInicio(''); }}
                className="px-3 py-2 rounded-xl bg-[#0C0A08] border border-[#2A211A] hover:border-[#FDE047]/50 text-left cursor-pointer">
                <p className="text-xs text-slate-300">{porId.get(d.mercado_id)?.nome ?? 'Mercado'}</p>
                <p className="text-sm font-mono font-bold text-[#FDE047]">{brl(d.total)} <span className="text-[10px] text-[#A8A29A] font-normal">· {d.pedidos} ped.</span></p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className={`${CARD} p-4 grid grid-cols-2 sm:grid-cols-4 gap-3`}>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL}>Mercado</label>
          <select value={mercadoId ?? ''} onChange={e => setMercadoId(e.target.value ? Number(e.target.value) : null)} className={INPUT}>
            <option value="">Todos</option>
            {mercados.map(m => <option key={m.id} value={m.id}>{m.nome}{m.ativo ? '' : ' (desativado)'}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>De</label>
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Até</label>
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} className={INPUT} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL}>Status</label>
          <select value={status ?? ''} onChange={e => setStatus(e.target.value === '' ? null : (Number(e.target.value) as StatusPedido))} className={INPUT}>
            <option value="">Todos</option>
            {([0, 1, 2] as StatusPedido[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-[#A8A29A]"><Spinner className="w-6 h-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={History} title="Nenhum pedido encontrado" text="Ajuste os filtros, ou lance um pedido na aba “Lançar Pedido”." />
      ) : (
        <>
          <p className="text-xs text-[#A8A29A] font-mono">{total} {total === 1 ? 'pedido' : 'pedidos'}</p>
          <div className="space-y-3">
            {rows.map(p => {
              const m = porId.get(p.mercado_id);
              const Icon = STATUS_ICON[p.status];
              const itens = itensCache[p.id];
              const exp = itens && m ? { mercadoNome: m.nome, cidade: m.cidade, data: p.data, linhas: itens } : null;
              return (
                <div key={p.id} className={`${CARD} p-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#F5F0EA] break-words">{m?.nome ?? 'Mercado'}{m?.cidade ? <span className="text-[#A8A29A] font-normal"> - {m.cidade}</span> : null}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#A8A29A]">
                        <span className="font-mono">{dataBR(p.data)}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${STATUS_STYLE[p.status]}`}>
                          <Icon className="w-3 h-3" /> {STATUS_LABELS[p.status]}
                        </span>
                        {p.status === 2 && (p.pago_em || p.forma_pagamento != null) && (
                          <span>{p.pago_em ? `em ${dataBR(p.pago_em)}` : ''}{p.forma_pagamento != null ? ` · ${formaLabel(p.forma_pagamento)}` : ''}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xl font-mono font-extrabold text-[#F5F0EA] sm:text-right">{brl(p.total_centavos)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <select
                      value={p.status}
                      disabled={busyId === p.id}
                      onChange={e => mudarStatus(p, Number(e.target.value) as StatusPedido)}
                      className="px-3 py-2 text-xs font-bold input-sushi focus:outline-none rounded-xl"
                      aria-label="Status"
                    >
                      {([0, 1, 2] as StatusPedido[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                    <button className={BTN_SECONDARY} onClick={() => toggleVer(p)}>
                      {aberto === p.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {aberto === p.id ? 'Ocultar' : 'Ver / Enviar'}
                    </button>
                    <button className={BTN_SECONDARY} onClick={() => onEditar(p.id)}><Pencil className="w-3.5 h-3.5" /> Editar</button>
                    <button className={BTN_DANGER} disabled={busyId === p.id} onClick={() => excluir(p)}>
                      {busyId === p.id ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir
                    </button>
                  </div>

                  {aberto === p.id && (
                    <div className="mt-4 space-y-3">
                      {!exp ? (
                        <div className="flex justify-center py-6 text-[#A8A29A]"><Spinner className="w-5 h-5" /></div>
                      ) : (
                        <>
                          <PedidoTabela titulo={`${exp.mercadoNome}${exp.cidade ? ` - ${exp.cidade}` : ''}`} data={dataBR(exp.data)} linhas={exp.linhas} brl={brl} />
                          <ExportActions pedido={exp} telefone={m?.telefone ?? null} notify={notify} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {paginas > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button className={BTN_SECONDARY} disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /> Anterior</button>
              <span className="text-xs font-mono text-[#A8A29A]">{page + 1} / {paginas}</span>
              <button className={BTN_SECONDARY} disabled={page >= paginas - 1} onClick={() => setPage(p => p + 1)}>Próxima <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}

      {pagando && (
        <PagamentoModal
          pedido={pagando}
          mercadoNome={porId.get(pagando.mercado_id)?.nome ?? 'Mercado'}
          onClose={() => setPagando(null)}
          onSaved={() => { setPagando(null); setReload(r => r + 1); notify('Pagamento registrado.'); }}
          notify={notify}
        />
      )}
    </div>
  );
}

function PagamentoModal({ pedido, mercadoNome, onClose, onSaved, notify }: { pedido: PedidoMercado; mercadoNome: string; onClose: () => void; onSaved: () => void; notify: Notify }) {
  const [pagoEm, setPagoEm] = useState(pedido.pago_em ?? hojeISO());
  const [forma, setForma] = useState<number>(pedido.forma_pagamento ?? 0);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!pagoEm) return notify('Informe a data do pagamento.', 'erro');
    setSalvando(true);
    try {
      await updatePedidoStatus(pedido.id, 2, pagoEm, forma);
      onSaved();
    } catch (e: any) {
      notify(e.message, 'erro');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#141210] border border-[#2A211A] w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-display font-bold text-[#F5F0EA]">Registrar pagamento</h3>
          <p className="text-xs text-[#A8A29A] mt-0.5">{mercadoNome} · {dataBR(pedido.data)} · <span className="font-mono text-[#F5F0EA]">{brl(pedido.total_centavos)}</span></p>
        </div>
        <div>
          <label className={LABEL}>Data do pagamento</label>
          <input type="date" value={pagoEm} onChange={e => setPagoEm(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Forma de pagamento</label>
          <div className="grid grid-cols-3 gap-2">
            {FORMAS_PAGAMENTO.map(f => (
              <button key={f.value} onClick={() => setForma(f.value)}
                className={`px-2 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${forma === f.value ? 'bg-[#1F1209] border-[#F97316] text-[#FB923C]' : 'bg-[#181512] border-[#2A211A] text-slate-300 hover:border-[#3A2E24]'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button className={BTN_SECONDARY} onClick={onClose}>Cancelar</button>
          <button className={BTN_PRIMARY} disabled={salvando} onClick={salvar}>{salvando ? <Spinner /> : <Check className="w-4 h-4" />} Marcar como pago</button>
        </div>
      </div>
    </div>
  );
}
