import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Store, Plus, RotateCcw, Save, Search, CheckCircle2, Package, X } from 'lucide-react';
import { getItens, getPedido, getUltimoPedido, listProdutos, Mercado, ProdutoMercado, salvarPedido } from '../../lib/mercadosRepo';
import { brl, dataBR, hojeISO, PedidoExport } from './mercadosShared';
import { BTN_ACCENT, BTN_PRIMARY, BTN_SECONDARY, CARD, EmptyState, ExportActions, INPUT, LABEL, PedidoTabela, QtyStepper, Spinner } from './ui';
import type { Notify } from '../MercadosManager';

interface Props {
  mercados: Mercado[];
  loadingMercados: boolean;
  pedidoId: number | null; // != null: editando um pedido salvo
  onDone: () => void;
  onCadastrar: (foco?: number | 'novo' | null) => void;
  notify: Notify;
}

const LAST_KEY = 'zushy_mercados_ultimo_mercado';
const lerUltimo = () => { try { return Number(localStorage.getItem(LAST_KEY)) || null; } catch { return null; } };
const gravarUltimo = (id: number) => { try { localStorage.setItem(LAST_KEY, String(id)); } catch { /* sem storage */ } };

export default function LancarPedido({ mercados, loadingMercados, pedidoId, onDone, onCadastrar, notify }: Props) {
  const ativos = useMemo(() => mercados.filter(m => m.ativo), [mercados]);
  const [mercadoId, setMercadoId] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [produtos, setProdutos] = useState<ProdutoMercado[]>([]);
  const [qtds, setQtds] = useState<Record<number, number>>({});
  // Preço "foto" dos itens de um pedido salvo — editar não reprecifica.
  const [precosSalvos, setPrecosSalvos] = useState<Record<number, number>>({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [repetindo, setRepetindo] = useState(false);
  const [busca, setBusca] = useState('');
  const [soPreenchidos, setSoPreenchidos] = useState(false);
  const [salvo, setSalvo] = useState<{ id: number; exp: PedidoExport; telefone: string | null; editado: boolean } | null>(null);
  const reqRef = useRef(0);

  const mercado = mercados.find(m => m.id === mercadoId) ?? null;

  const carregarMercado = async (id: number, itens?: { produto_id: number; qtd: number; preco_centavos: number }[]) => {
    const req = ++reqRef.current;
    setCarregando(true);
    try {
      const lista = await listProdutos(id);
      if (req !== reqRef.current) return;
      const noPedido = new Set((itens || []).map(i => i.produto_id));
      // Ativos + desativados que já estão no pedido sendo editado.
      setProdutos(lista.filter(p => p.ativo || noPedido.has(p.id)));
      setQtds(Object.fromEntries((itens || []).map(i => [i.produto_id, i.qtd])));
      setPrecosSalvos(Object.fromEntries((itens || []).map(i => [i.produto_id, i.preco_centavos])));
    } catch (e: any) {
      notify(e.message, 'erro');
    } finally {
      if (req === reqRef.current) setCarregando(false);
    }
  };

  // Abre um pedido salvo para edição, ou começa um novo.
  useEffect(() => {
    setSalvo(null);
    setBusca('');
    if (pedidoId) {
      (async () => {
        try {
          const [ped, itens] = await Promise.all([getPedido(pedidoId), getItens(pedidoId)]);
          if (!ped) { notify('Pedido não encontrado.', 'erro'); onDone(); return; }
          setMercadoId(ped.mercado_id);
          setData(ped.data);
          await carregarMercado(ped.mercado_id, itens);
        } catch (e: any) {
          notify(e.message, 'erro');
        }
      })();
    } else {
      setData(hojeISO());
      setPrecosSalvos({});
      setQtds({});
      if (loadingMercados) return;
      const ultimo = lerUltimo();
      const inicial = ativos.find(m => m.id === ultimo)?.id ?? (ativos.length === 1 ? ativos[0].id : null);
      setMercadoId(inicial);
      if (inicial) carregarMercado(inicial);
      else setProdutos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId, loadingMercados]);

  const trocarMercado = (id: number | null) => {
    const temQtd = Object.values(qtds).some(q => q > 0);
    if (temQtd && !window.confirm('Trocar de mercado limpa as quantidades preenchidas. Continuar?')) return;
    setMercadoId(id);
    setSalvo(null);
    setBusca('');
    if (id) { gravarUltimo(id); carregarMercado(id); }
    else { setProdutos([]); setQtds({}); setPrecosSalvos({}); }
  };

  const precoDe = (p: ProdutoMercado) => precosSalvos[p.id] ?? p.preco_centavos;
  const linhas = produtos.map(p => ({ produto: p, qtd: qtds[p.id] || 0, preco: precoDe(p) }));
  const total = linhas.reduce((s, l) => s + l.qtd * l.preco, 0);
  const itensPreenchidos = linhas.filter(l => l.qtd > 0).length;
  const unidades = linhas.reduce((s, l) => s + l.qtd, 0);

  const filtradas = linhas.filter(l =>
    (!soPreenchidos || l.qtd > 0) &&
    (!busca.trim() || l.produto.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  );

  const repetirUltimo = async () => {
    if (!mercadoId) return;
    setRepetindo(true);
    try {
      const ultimo = await getUltimoPedido(mercadoId, pedidoId);
      if (!ultimo) { notify('Este mercado ainda não tem pedido anterior.', 'erro'); return; }
      const itens = await getItens(ultimo.id);
      const disponiveis = new Set(produtos.map(p => p.id));
      const usados = itens.filter(i => disponiveis.has(i.produto_id));
      setQtds(Object.fromEntries(usados.map(i => [i.produto_id, i.qtd])));
      const fora = itens.length - usados.length;
      notify(`Quantidades do pedido de ${dataBR(ultimo.data)} preenchidas${fora > 0 ? ` (${fora} produto(s) desativado(s) ficaram de fora)` : ''}. Os preços são os atuais.`);
    } catch (e: any) {
      notify(e.message, 'erro');
    } finally {
      setRepetindo(false);
    }
  };

  const salvar = async () => {
    if (!mercado) return notify('Escolha o mercado.', 'erro');
    if (!data) return notify('Informe a data do pedido.', 'erro');
    if (linhas.some(l => l.qtd < 0)) return notify('A quantidade não pode ser negativa.', 'erro');
    if (itensPreenchidos === 0) return notify('O pedido está vazio: informe a quantidade de pelo menos um produto.', 'erro');
    setSalvando(true);
    try {
      const id = await salvarPedido(pedidoId, mercado.id, data, linhas.map(l => ({ produto_id: l.produto.id, qtd: l.qtd, preco_centavos: l.preco })));
      gravarUltimo(mercado.id);
      setSalvo({
        id,
        editado: !!pedidoId,
        telefone: mercado.telefone,
        exp: { mercadoNome: mercado.nome, cidade: mercado.cidade, data, linhas: linhas.map(l => ({ nome: l.produto.nome, qtd: l.qtd, preco_centavos: l.preco })) }
      });
      notify(pedidoId ? 'Pedido atualizado.' : 'Pedido salvo!');
    } catch (e: any) {
      notify(e.message, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const novoPedido = () => {
    setSalvo(null);
    setQtds({});
    setPrecosSalvos({});
    setData(hojeISO());
    if (pedidoId) onDone();
    else if (mercadoId) carregarMercado(mercadoId);
  };

  if (loadingMercados) return <div className="flex justify-center py-16 text-[#A8A29A]"><Spinner className="w-6 h-6" /></div>;

  if (ativos.length === 0 && !pedidoId) {
    return (
      <EmptyState
        icon={Store}
        title="Cadastre um mercado para lançar pedidos"
        text="Os pedidos são lançados a partir da lista de produtos e preços de cada mercado."
        action={<button className={BTN_PRIMARY} onClick={() => onCadastrar('novo')}><Plus className="w-4 h-4" /> Cadastrar primeiro mercado</button>}
      />
    );
  }

  // Tela de sucesso: o pedido no formato da planilha + envio/impressão.
  if (salvo) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-[#0F1F14] border border-[#166534] text-[#86EFAC]">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{salvo.editado ? 'Pedido atualizado.' : 'Pedido salvo.'} Envie ou imprima abaixo.</span>
        </div>
        <PedidoTabela titulo={`${salvo.exp.mercadoNome}${salvo.exp.cidade ? ` - ${salvo.exp.cidade}` : ''}`} data={dataBR(salvo.exp.data)} linhas={salvo.exp.linhas} brl={brl} />
        <ExportActions pedido={salvo.exp} telefone={salvo.telefone} notify={notify} />
        <div className="pt-2 flex justify-center">
          <button className={BTN_PRIMARY} onClick={novoPedido}><Plus className="w-4 h-4" /> {salvo.editado ? 'Voltar a lançar pedidos' : 'Lançar novo pedido'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-4">
      {pedidoId && (
        <div className="flex items-center justify-between gap-2 mb-4 p-3 rounded-xl bg-[#1F1209] border border-[#4A2A10] text-sm text-[#FB923C]">
          <span className="font-semibold">Editando pedido salvo</span>
          <button className={BTN_SECONDARY} onClick={onDone}><X className="w-3.5 h-3.5" /> Cancelar edição</button>
        </div>
      )}

      <div className={`${CARD} p-4 sm:p-5 mb-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
          <div>
            <label className={LABEL}>Mercado</label>
            <select value={mercadoId ?? ''} onChange={e => trocarMercado(e.target.value ? Number(e.target.value) : null)} className={`${INPUT} text-base`}>
              <option value="">Escolha o mercado…</option>
              {mercados.filter(m => m.ativo || m.id === mercadoId).map(m => (
                <option key={m.id} value={m.id}>{m.nome}{m.cidade ? ` - ${m.cidade}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={`${INPUT} text-base`} />
          </div>
        </div>
        {mercado && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button className={BTN_ACCENT} onClick={repetirUltimo} disabled={repetindo || carregando || produtos.length === 0}>
              {repetindo ? <Spinner /> : <RotateCcw className="w-4 h-4" />} Repetir último pedido
            </button>
            {itensPreenchidos > 0 && (
              <button className={BTN_SECONDARY} onClick={() => { if (window.confirm('Zerar todas as quantidades?')) setQtds({}); }}>Zerar quantidades</button>
            )}
          </div>
        )}
      </div>

      {!mercado ? (
        <EmptyState icon={ClipboardList} title="Escolha o mercado" text="Os produtos ativos dele aparecem aqui com o preço; é só preencher as quantidades." />
      ) : carregando ? (
        <div className="flex justify-center py-16 text-[#A8A29A]"><Spinner className="w-6 h-6" /></div>
      ) : produtos.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Este mercado ainda não tem produtos"
          text="Cadastre os produtos e preços dele (ou copie de outro mercado) para lançar o pedido."
          action={<button className={BTN_PRIMARY} onClick={() => onCadastrar(mercado.id)}><Plus className="w-4 h-4" /> Cadastrar produtos</button>}
        />
      ) : (
        <>
          {produtos.length > 8 && (
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto…" className={`${INPUT} pl-9`} />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#A8A29A] px-1 cursor-pointer shrink-0">
                <input type="checkbox" checked={soPreenchidos} onChange={e => setSoPreenchidos(e.target.checked)} /> Só os preenchidos
              </label>
            </div>
          )}

          <div className={`${CARD} overflow-hidden`}>
            <div className="hidden sm:grid grid-cols-[1fr_110px_170px_110px] gap-3 px-4 py-2.5 bg-[#0C0A08] text-[10px] font-mono uppercase tracking-wider text-[#A8A29A] font-bold">
              <span>Produto</span><span className="text-right">Custo Unit.</span><span className="text-center">Qtd.</span><span className="text-right">Total</span>
            </div>
            <ul className="divide-y divide-[#2A211A]">
              {filtradas.map(({ produto: p, qtd, preco }) => (
                <li key={p.id} className={`px-4 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_110px_170px_110px] gap-x-3 gap-y-2 items-center ${qtd > 0 ? 'bg-[#1A130C]' : ''}`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium break-words ${qtd > 0 ? 'text-[#F5F0EA]' : 'text-slate-300'}`}>{p.nome}{!p.ativo && <span className="ml-1.5 text-[10px] font-mono text-[#A8A29A]">(desativado)</span>}</p>
                    <p className="sm:hidden text-xs font-mono text-[#A8A29A]">{brl(preco)}</p>
                  </div>
                  <span className="hidden sm:block text-right font-mono text-sm text-[#A8A29A]">{brl(preco)}</span>
                  <div className="row-span-2 sm:row-span-1 flex justify-end sm:justify-center">
                    <QtyStepper value={qtd} onChange={v => setQtds(prev => ({ ...prev, [p.id]: v }))} />
                  </div>
                  <span className={`text-left sm:text-right font-mono text-sm ${qtd > 0 ? 'text-[#FB923C] font-bold' : 'text-[#A8A29A]/50'}`}>
                    {qtd > 0 ? brl(qtd * preco) : '—'}
                  </span>
                </li>
              ))}
              {filtradas.length === 0 && <li className="px-4 py-6 text-center text-sm text-[#A8A29A]">Nenhum produto encontrado.</li>}
            </ul>
          </div>

          {/* Barra fixa: total na hora + salvar */}
          <div className="sticky bottom-0 mt-4 -mx-4 sm:mx-0 px-4 sm:px-0 pb-3 pt-3 bg-gradient-to-t from-[#0C0A08] via-[#0C0A08] to-transparent">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#181512] border border-[#3A2E24] shadow-2xl">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#A8A29A]">
                  Total · {itensPreenchidos} {itensPreenchidos === 1 ? 'item' : 'itens'} · {unidades} un.
                </p>
                <p className="text-2xl font-display font-extrabold text-[#F5F0EA] font-mono truncate">{brl(total)}</p>
              </div>
              <button className={`${BTN_PRIMARY} px-5 py-3 text-sm`} onClick={salvar} disabled={salvando || itensPreenchidos === 0}>
                {salvando ? <Spinner /> : <Save className="w-4 h-4" />} {pedidoId ? 'Salvar alterações' : 'Salvar pedido'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
