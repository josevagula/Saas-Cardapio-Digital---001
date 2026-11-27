import React, { useEffect, useMemo, useState } from 'react';
import { Store, Plus, Pencil, ArrowLeft, ChevronUp, ChevronDown, Copy, Package, Save, X, Phone, MapPin, Power } from 'lucide-react';
import { createMercado, createProduto, copyProdutos, listProdutos, Mercado, MercadoInput, ProdutoMercado, updateMercado, updateProduto } from '../../lib/mercadosRepo';
import { brl, centavosToInput, parseReaisToCentavos } from './mercadosShared';
import { BTN_ACCENT, BTN_PRIMARY, BTN_SECONDARY, CARD, EmptyState, INPUT, LABEL, Spinner } from './ui';
import type { Notify } from '../MercadosManager';

interface Props {
  mercados: Mercado[];
  loading: boolean;
  foco: number | 'novo' | null;
  onChanged: () => Promise<void> | void;
  notify: Notify;
}

const vazio: MercadoInput = { nome: '', cidade: '', contato: '', telefone: '', obs: '' };
const limpar = (v: string | null) => (v && v.trim() ? v.trim() : null);

export default function CadastroMercados({ mercados, loading, foco, onChanged, notify }: Props) {
  const [selecionado, setSelecionado] = useState<number | null>(typeof foco === 'number' ? foco : null);
  const [form, setForm] = useState<MercadoInput | null>(foco === 'novo' ? { ...vazio } : null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  useEffect(() => {
    if (foco === 'novo') { setForm({ ...vazio }); setEditandoId(null); }
    else if (typeof foco === 'number') setSelecionado(foco);
  }, [foco]);

  const lista = useMemo(() => mercados.filter(m => mostrarInativos || m.ativo), [mercados, mostrarInativos]);
  const mercado = mercados.find(m => m.id === selecionado) ?? null;

  const abrirNovo = () => { setForm({ ...vazio }); setEditandoId(null); };
  const abrirEdicao = (m: Mercado) => {
    setForm({ nome: m.nome, cidade: m.cidade ?? '', contato: m.contato ?? '', telefone: m.telefone ?? '', obs: m.obs ?? '' });
    setEditandoId(m.id);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.nome.trim()) return notify('Informe o nome do mercado.', 'erro');
    setSalvando(true);
    try {
      const dados: MercadoInput = { nome: form.nome.trim(), cidade: limpar(form.cidade), contato: limpar(form.contato), telefone: limpar(form.telefone), obs: limpar(form.obs) };
      if (editandoId) {
        await updateMercado(editandoId, dados);
        notify('Mercado atualizado.');
      } else {
        const novo = await createMercado(dados);
        setSelecionado(novo.id);
        notify('Mercado cadastrado! Agora cadastre os produtos dele.');
      }
      setForm(null);
      setEditandoId(null);
      await onChanged();
    } catch (err: any) {
      notify(err.message, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (m: Mercado) => {
    if (m.ativo && !window.confirm(`Desativar "${m.nome}"? Ele sai da lista de lançamento, mas o histórico de pedidos é mantido.`)) return;
    try {
      await updateMercado(m.id, { ativo: !m.ativo });
      notify(m.ativo ? 'Mercado desativado.' : 'Mercado reativado.');
      await onChanged();
    } catch (err: any) {
      notify(err.message, 'erro');
    }
  };

  if (loading) return <div className="flex justify-center py-16 text-[#A8A29A]"><Spinner className="w-6 h-6" /></div>;

  const formulario = form && (
    <form onSubmit={salvar} className={`${CARD} p-4 sm:p-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-[#F5F0EA]">{editandoId ? 'Editar mercado' : 'Novo mercado'}</h3>
        <button type="button" onClick={() => { setForm(null); setEditandoId(null); }} className="p-1.5 rounded-lg text-[#A8A29A] hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Nome do mercado *</label>
          <input autoFocus value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={INPUT} placeholder="Ex.: Supermercado Bom Preço" />
        </div>
        <div>
          <label className={LABEL}>Cidade</label>
          <input value={form.cidade ?? ''} onChange={e => setForm({ ...form, cidade: e.target.value })} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Responsável / contato</label>
          <input value={form.contato ?? ''} onChange={e => setForm({ ...form, contato: e.target.value })} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Telefone (WhatsApp)</label>
          <input value={form.telefone ?? ''} onChange={e => setForm({ ...form, telefone: e.target.value })} inputMode="tel" className={INPUT} placeholder="(43) 99999-9999" />
        </div>
      </div>
      <div>
        <label className={LABEL}>Observações</label>
        <textarea rows={2} value={form.obs ?? ''} onChange={e => setForm({ ...form, obs: e.target.value })} className={`${INPUT} resize-none`} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECONDARY} onClick={() => { setForm(null); setEditandoId(null); }}>Cancelar</button>
        <button type="submit" className={BTN_PRIMARY} disabled={salvando}>{salvando ? <Spinner /> : <Save className="w-4 h-4" />} Salvar</button>
      </div>
    </form>
  );

  if (mercados.length === 0) {
    return form ? formulario : (
      <EmptyState
        icon={Store}
        title="Nenhum mercado cadastrado ainda"
        text="Cadastre os supermercados para quem você vende. Depois, cada um recebe a própria lista de produtos e preços."
        action={<button className={BTN_PRIMARY} onClick={abrirNovo}><Plus className="w-4 h-4" /> Cadastrar primeiro mercado</button>}
      />
    );
  }

  // No celular mostra a lista OU o detalhe/formulário; no desktop, os dois.
  const detalheAberto = !!mercado || !!form;
  const mostrarMercado = mercado && !(form && !editandoId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className={`space-y-3 ${detalheAberto ? 'hidden lg:block' : ''}`}>
        <button className={`${BTN_PRIMARY} w-full`} onClick={abrirNovo}><Plus className="w-4 h-4" /> Novo mercado</button>
        <label className="flex items-center gap-2 text-xs text-[#A8A29A] px-1 cursor-pointer">
          <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} />
          Mostrar desativados
        </label>
        <div className="space-y-2">
          {lista.map(m => (
            <button
              key={m.id}
              onClick={() => { setSelecionado(m.id); setForm(null); setEditandoId(null); }}
              className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                m.id === selecionado ? 'bg-[#1F1209] border-[#F97316]' : 'bg-[#141210] border-[#2A211A] hover:border-[#3A2E24]'
              } ${m.ativo ? '' : 'opacity-60'}`}
            >
              <p className="font-semibold text-[#F5F0EA] truncate">{m.nome}{!m.ativo && <span className="ml-2 text-[10px] font-mono text-[#A8A29A]">(desativado)</span>}</p>
              <p className="text-xs text-[#A8A29A] truncate">{m.cidade || 'Sem cidade'}{m.contato ? ` · ${m.contato}` : ''}</p>
            </button>
          ))}
          {lista.length === 0 && <p className="text-xs text-[#A8A29A] px-1">Todos os mercados estão desativados.</p>}
        </div>
      </div>

      <div className={`space-y-6 min-w-0 ${detalheAberto ? '' : 'hidden lg:block'}`}>
        {formulario}

        {mostrarMercado && mercado ? (
          <>
            <div className={`${CARD} p-4 sm:p-5`}>
              <button onClick={() => setSelecionado(null)} className="lg:hidden flex items-center gap-1 text-xs text-[#A8A29A] mb-3 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" /> Todos os mercados</button>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xl font-display font-extrabold text-[#F5F0EA] break-words">{mercado.nome}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A8A29A] mt-1">
                    {mercado.cidade && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{mercado.cidade}</span>}
                    {mercado.telefone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{mercado.telefone}{mercado.contato ? ` (${mercado.contato})` : ''}</span>}
                  </div>
                  {mercado.obs && <p className="text-xs text-slate-300 mt-2 whitespace-pre-line">{mercado.obs}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className={BTN_SECONDARY} onClick={() => abrirEdicao(mercado)}><Pencil className="w-3.5 h-3.5" /> Editar</button>
                  <button className={BTN_SECONDARY} onClick={() => alternarAtivo(mercado)}><Power className="w-3.5 h-3.5" /> {mercado.ativo ? 'Desativar' : 'Reativar'}</button>
                </div>
              </div>
            </div>
            <ProdutosDoMercado mercado={mercado} mercados={mercados} notify={notify} />
          </>
        ) : !form && (
          <div className="hidden lg:block">
            <EmptyState icon={Package} title="Selecione um mercado" text="Escolha um mercado na lista para ver e editar os produtos e preços dele." />
          </div>
        )}
      </div>
    </div>
  );
}

function ProdutosDoMercado({ mercado, mercados, notify }: { mercado: Mercado; mercados: Mercado[]; notify: Notify }) {
  const [produtos, setProdutos] = useState<ProdutoMercado[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [busy, setBusy] = useState(false);
  const [origemCopia, setOrigemCopia] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const carregar = async () => {
    try {
      setProdutos(await listProdutos(mercado.id));
    } catch (e: any) {
      notify(e.message, 'erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setEditId(null);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mercado.id]);

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    const centavos = parseReaisToCentavos(preco);
    if (!nome.trim()) return notify('Informe o nome do produto.', 'erro');
    if (centavos == null) return notify('Informe um preço válido (ex.: 42,00).', 'erro');
    setAdicionando(true);
    try {
      const ordem = produtos.reduce((max, p) => Math.max(max, p.ordem), -1) + 1;
      const novo = await createProduto(mercado.id, nome.trim(), centavos, ordem);
      setProdutos(prev => [...prev, novo]);
      setNome('');
      setPreco('');
      notify('Produto adicionado.');
      (document.getElementById('novo-produto-nome') as HTMLInputElement | null)?.focus();
    } catch (err: any) {
      notify(err.message, 'erro');
    } finally {
      setAdicionando(false);
    }
  };

  const salvarEdicao = async (p: ProdutoMercado) => {
    const centavos = parseReaisToCentavos(editPreco);
    if (!editNome.trim()) return notify('O nome do produto é obrigatório.', 'erro');
    if (centavos == null) return notify('Informe um preço válido.', 'erro');
    setBusy(true);
    try {
      await updateProduto(p.id, { nome: editNome.trim(), preco_centavos: centavos });
      setProdutos(prev => prev.map(x => (x.id === p.id ? { ...x, nome: editNome.trim(), preco_centavos: centavos } : x)));
      setEditId(null);
      notify('Produto atualizado.');
    } catch (err: any) {
      notify(err.message, 'erro');
    } finally {
      setBusy(false);
    }
  };

  const alternarAtivo = async (p: ProdutoMercado) => {
    setBusy(true);
    try {
      await updateProduto(p.id, { ativo: !p.ativo });
      setProdutos(prev => prev.map(x => (x.id === p.id ? { ...x, ativo: !p.ativo } : x)));
      notify(p.ativo ? 'Produto desativado (o histórico é mantido).' : 'Produto reativado.');
    } catch (err: any) {
      notify(err.message, 'erro');
    } finally {
      setBusy(false);
    }
  };

  // Move dentro da lista inteira e regrava só as posições que mudaram.
  const mover = async (p: ProdutoMercado, dir: -1 | 1) => {
    const lista = [...produtos];
    const i = lista.findIndex(x => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    const mudados = lista.map((x, idx) => ({ ...x, ordem: idx })).filter((x, idx) => produtos.find(o => o.id === x.id)!.ordem !== idx);
    setProdutos(lista.map((x, idx) => ({ ...x, ordem: idx })));
    try {
      await Promise.all(mudados.map(x => updateProduto(x.id, { ordem: x.ordem })));
    } catch (err: any) {
      notify(err.message, 'erro');
      carregar();
    }
  };

  const copiar = async () => {
    const origem = Number(origemCopia);
    if (!origem) return;
    const nomeOrigem = mercados.find(m => m.id === origem)?.nome;
    if (!window.confirm(`Copiar os produtos ativos de "${nomeOrigem}" para "${mercado.nome}"? Produtos com o mesmo nome são pulados. Você pode ajustar os preços depois.`)) return;
    setBusy(true);
    try {
      const n = await copyProdutos(origem, mercado.id);
      notify(n > 0 ? `${n} produto(s) copiado(s). Ajuste os preços se precisar.` : 'Nenhum produto novo para copiar.');
      setOrigemCopia('');
      await carregar();
    } catch (err: any) {
      notify(err.message, 'erro');
    } finally {
      setBusy(false);
    }
  };

  const visiveis = produtos.filter(p => mostrarInativos || p.ativo);
  const outros = mercados.filter(m => m.id !== mercado.id);

  return (
    <div className={`${CARD} p-4 sm:p-5 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display font-bold text-[#F5F0EA] flex items-center gap-2"><Package className="w-4 h-4 text-[#FB923C]" /> Produtos e preços deste mercado</h4>
        <label className="flex items-center gap-2 text-xs text-[#A8A29A] cursor-pointer">
          <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} /> Mostrar desativados
        </label>
      </div>

      <form onSubmit={adicionar} className="grid grid-cols-[1fr_110px] sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
        <div>
          <label className={LABEL}>Produto *</label>
          <input id="novo-produto-nome" value={nome} onChange={e => setNome(e.target.value)} className={INPUT} placeholder="Ex.: Combo 20 peças" />
        </div>
        <div>
          <label className={LABEL}>Preço (R$) *</label>
          <input value={preco} onChange={e => setPreco(e.target.value)} inputMode="decimal" className={INPUT} placeholder="0,00" />
        </div>
        <button type="submit" disabled={adicionando} className={`${BTN_PRIMARY} col-span-2 sm:col-span-1`}>{adicionando ? <Spinner /> : <Plus className="w-4 h-4" />} Adicionar</button>
      </form>

      {outros.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-[#0C0A08] border border-[#2A211A]">
          <select value={origemCopia} onChange={e => setOrigemCopia(e.target.value)} className={INPUT}>
            <option value="">Copiar a lista de produtos de outro mercado…</option>
            {outros.map(m => <option key={m.id} value={m.id}>{m.nome}{m.cidade ? ` - ${m.cidade}` : ''}</option>)}
          </select>
          <button onClick={copiar} disabled={!origemCopia || busy} className={`${BTN_ACCENT} shrink-0`}><Copy className="w-4 h-4" /> Copiar</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8 text-[#A8A29A]"><Spinner className="w-5 h-5" /></div>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-[#A8A29A] text-center py-6">
          {produtos.length === 0 ? 'Nenhum produto ainda. Adicione acima ou copie de outro mercado.' : 'Todos os produtos estão desativados.'}
        </p>
      ) : (
        <ul className="divide-y divide-[#2A211A] border border-[#2A211A] rounded-xl overflow-hidden">
          {visiveis.map(p => {
            const idx = produtos.findIndex(x => x.id === p.id);
            return (
              <li key={p.id} className={`p-3 bg-[#141210] ${p.ativo ? '' : 'opacity-60'}`}>
                {editId === p.id ? (
                  <div className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_130px_auto] gap-2 items-center">
                    <input autoFocus value={editNome} onChange={e => setEditNome(e.target.value)} className={INPUT} />
                    <input value={editPreco} onChange={e => setEditPreco(e.target.value)} inputMode="decimal" className={INPUT}
                      onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(p); }} />
                    <div className="flex gap-2 col-span-2 sm:col-span-1 justify-end">
                      <button className={BTN_SECONDARY} onClick={() => setEditId(null)}>Cancelar</button>
                      <button className={BTN_PRIMARY} disabled={busy} onClick={() => salvarEdicao(p)}>{busy ? <Spinner /> : <Save className="w-4 h-4" />} Salvar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col shrink-0">
                      <button aria-label="Subir" disabled={idx <= 0} onClick={() => mover(p, -1)} className="p-1 text-[#A8A29A] hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"><ChevronUp className="w-4 h-4" /></button>
                      <button aria-label="Descer" disabled={idx >= produtos.length - 1} onClick={() => mover(p, 1)} className="p-1 text-[#A8A29A] hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F5F0EA] break-words">{p.nome}{!p.ativo && <span className="ml-2 text-[10px] font-mono text-[#A8A29A]">(desativado)</span>}</p>
                      <p className="text-sm font-mono text-[#FB923C]">{brl(p.preco_centavos)}</p>
                    </div>
                    <button className="p-2 rounded-lg border border-[#2A211A] text-slate-300 hover:bg-[#2A211A] cursor-pointer" title="Editar"
                      onClick={() => { setEditId(p.id); setEditNome(p.nome); setEditPreco(centavosToInput(p.preco_centavos)); }}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg border border-[#2A211A] text-slate-300 hover:bg-[#2A211A] cursor-pointer" disabled={busy} title={p.ativo ? 'Desativar' : 'Reativar'} onClick={() => alternarAtivo(p)}>
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
