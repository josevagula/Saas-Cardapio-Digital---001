import { supabase } from './supabase';

// Módulo "Mercados" (venda para supermercados). Tabelas da migration
// 20261127120000_mercados.sql — dinheiro sempre em centavos (integer).
// RLS limita tudo ao dono logado; user_id é preenchido pelo default
// auth.uid() no banco, então não é enviado daqui.

export interface Mercado {
  id: number;
  nome: string;
  cidade: string | null;
  contato: string | null;
  telefone: string | null;
  ativo: boolean;
  obs: string | null;
}

export interface ProdutoMercado {
  id: number;
  mercado_id: number;
  nome: string;
  preco_centavos: number;
  ativo: boolean;
  ordem: number;
}

export type StatusPedido = 0 | 1 | 2;
export const STATUS_LABELS: Record<StatusPedido, string> = { 0: 'Pendente', 1: 'Entregue', 2: 'Pago' };

export const FORMAS_PAGAMENTO: { value: number; label: string }[] = [
  { value: 0, label: 'Pix' },
  { value: 1, label: 'Dinheiro' },
  { value: 2, label: 'Boleto' },
  { value: 3, label: 'Cartão' },
  { value: 4, label: 'Transferência' },
  { value: 5, label: 'Outro' }
];
export const formaLabel = (v: number | null | undefined) => FORMAS_PAGAMENTO.find(f => f.value === v)?.label ?? '';

export interface PedidoMercado {
  id: number;
  mercado_id: number;
  data: string; // YYYY-MM-DD
  status: StatusPedido;
  pago_em: string | null;
  forma_pagamento: number | null;
  total_centavos: number;
}

export interface ItemPedido {
  produto_id: number;
  qtd: number;
  preco_centavos: number;
  nome: string;
}

export interface ResumoMercados {
  dia: number;
  semana: number;
  mes: number;
  pedidos_dia: number;
  pedidos_mes: number;
  a_receber: number;
  devendo: { mercado_id: number; total: number; pedidos: number }[];
  producao_dia: { nome: string; qtd: number }[];
  ranking_mercados: { mercado_id: number; total: number; pedidos: number }[];
  ranking_produtos: { nome: string; qtd: number; total: number }[];
}

const MERCADO_COLS = 'id, nome, cidade, contato, telefone, ativo, obs';
const PRODUTO_COLS = 'id, mercado_id, nome, preco_centavos, ativo, ordem';
const PEDIDO_COLS = 'id, mercado_id, data, status, pago_em, forma_pagamento, total_centavos';

const fail = (what: string, error: { message: string }) => new Error(`${what}: ${error.message}`);

// ---------- Mercados ----------

export async function listMercados(): Promise<Mercado[]> {
  const { data, error } = await supabase.from('mercados').select(MERCADO_COLS).order('nome');
  if (error) throw fail('Erro ao carregar mercados', error);
  return (data || []) as Mercado[];
}

export type MercadoInput = Pick<Mercado, 'nome' | 'cidade' | 'contato' | 'telefone' | 'obs'>;

export async function createMercado(input: MercadoInput): Promise<Mercado> {
  const { data, error } = await supabase.from('mercados').insert(input).select(MERCADO_COLS).single();
  if (error) throw fail('Erro ao cadastrar mercado', error);
  return data as Mercado;
}

export async function updateMercado(id: number, changes: Partial<MercadoInput & { ativo: boolean }>): Promise<Mercado> {
  const { data, error } = await supabase.from('mercados').update(changes).eq('id', id).select(MERCADO_COLS).single();
  if (error) throw fail('Erro ao salvar mercado', error);
  return data as Mercado;
}

// ---------- Produtos ----------

export async function listProdutos(mercadoId: number): Promise<ProdutoMercado[]> {
  const { data, error } = await supabase
    .from('produtos_mercado')
    .select(PRODUTO_COLS)
    .eq('mercado_id', mercadoId)
    .order('ordem')
    .order('id');
  if (error) throw fail('Erro ao carregar produtos', error);
  return (data || []) as ProdutoMercado[];
}

export async function createProduto(mercadoId: number, nome: string, precoCentavos: number, ordem: number): Promise<ProdutoMercado> {
  const { data, error } = await supabase
    .from('produtos_mercado')
    .insert({ mercado_id: mercadoId, nome, preco_centavos: precoCentavos, ordem })
    .select(PRODUTO_COLS)
    .single();
  if (error) throw fail('Erro ao cadastrar produto', error);
  return data as ProdutoMercado;
}

export async function updateProduto(id: number, changes: Partial<Pick<ProdutoMercado, 'nome' | 'preco_centavos' | 'ativo' | 'ordem'>>): Promise<void> {
  const { error } = await supabase.from('produtos_mercado').update(changes).eq('id', id);
  if (error) throw fail('Erro ao salvar produto', error);
}

// Copia os produtos ATIVOS de um mercado para outro (preços iguais, que
// depois podem ser ajustados só no destino). Produtos com o mesmo nome já
// existentes no destino são pulados. Retorna quantos foram copiados.
export async function copyProdutos(origemId: number, destinoId: number): Promise<number> {
  const [origem, destino] = await Promise.all([listProdutos(origemId), listProdutos(destinoId)]);
  const existentes = new Set(destino.map(p => p.nome.trim().toLowerCase()));
  let ordem = destino.reduce((max, p) => Math.max(max, p.ordem), -1) + 1;
  const novos = origem
    .filter(p => p.ativo && !existentes.has(p.nome.trim().toLowerCase()))
    .map(p => ({ mercado_id: destinoId, nome: p.nome, preco_centavos: p.preco_centavos, ordem: ordem++ }));
  if (novos.length === 0) return 0;
  const { error } = await supabase.from('produtos_mercado').insert(novos);
  if (error) throw fail('Erro ao copiar produtos', error);
  return novos.length;
}

// ---------- Pedidos ----------

export interface PedidosFiltro {
  mercadoId?: number | null;
  inicio?: string;
  fim?: string;
  status?: StatusPedido | null;
}

export async function listPedidos(filtro: PedidosFiltro, page: number, pageSize: number): Promise<{ rows: PedidoMercado[]; total: number }> {
  let q = supabase.from('pedidos_mercado').select(PEDIDO_COLS, { count: 'exact' });
  if (filtro.mercadoId) q = q.eq('mercado_id', filtro.mercadoId);
  if (filtro.inicio) q = q.gte('data', filtro.inicio);
  if (filtro.fim) q = q.lte('data', filtro.fim);
  if (filtro.status != null) q = q.eq('status', filtro.status);
  const from = page * pageSize;
  const { data, error, count } = await q.order('data', { ascending: false }).order('id', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw fail('Erro ao carregar pedidos', error);
  return { rows: (data || []) as PedidoMercado[], total: count ?? 0 };
}

export async function getItens(pedidoId: number): Promise<ItemPedido[]> {
  const { data, error } = await supabase
    .from('itens_pedido')
    .select('produto_id, qtd, preco_centavos, produtos_mercado(nome, ordem)')
    .eq('pedido_id', pedidoId);
  if (error) throw fail('Erro ao carregar itens', error);
  return (data || [])
    .map((r: any) => ({
      produto_id: r.produto_id,
      qtd: r.qtd,
      preco_centavos: r.preco_centavos,
      nome: r.produtos_mercado?.nome ?? 'Produto',
      _ordem: r.produtos_mercado?.ordem ?? 0
    }))
    .sort((a, b) => a._ordem - b._ordem)
    .map(({ _ordem, ...i }) => i);
}

export async function getPedido(id: number): Promise<PedidoMercado | null> {
  const { data, error } = await supabase.from('pedidos_mercado').select(PEDIDO_COLS).eq('id', id).maybeSingle();
  if (error) throw fail('Erro ao carregar pedido', error);
  return (data as PedidoMercado) ?? null;
}

// Último pedido do mercado (para "Repetir último pedido").
export async function getUltimoPedido(mercadoId: number, excetoId?: number | null): Promise<PedidoMercado | null> {
  let q = supabase.from('pedidos_mercado').select(PEDIDO_COLS).eq('mercado_id', mercadoId);
  if (excetoId) q = q.neq('id', excetoId);
  const { data, error } = await q.order('data', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) throw fail('Erro ao buscar último pedido', error);
  return (data as PedidoMercado) ?? null;
}

// Cria (pedidoId null) ou atualiza o pedido e seus itens numa transação; o
// total é calculado no banco. Itens com qtd 0 não são enviados/salvos.
export async function salvarPedido(
  pedidoId: number | null,
  mercadoId: number,
  data: string,
  itens: { produto_id: number; qtd: number; preco_centavos: number }[]
): Promise<number> {
  const { data: id, error } = await supabase.rpc('salvar_pedido_mercado', {
    p_pedido_id: pedidoId,
    p_mercado_id: mercadoId,
    p_data: data,
    p_itens: itens.filter(i => i.qtd > 0)
  });
  if (error) {
    if (error.message.includes('pedido_vazio')) throw new Error('O pedido está vazio: informe a quantidade de pelo menos um produto.');
    throw fail('Erro ao salvar pedido', error);
  }
  return id as number;
}

export async function updatePedidoStatus(id: number, status: StatusPedido, pagoEm: string | null, forma: number | null): Promise<void> {
  const { error } = await supabase
    .from('pedidos_mercado')
    .update({ status, pago_em: status === 2 ? pagoEm : null, forma_pagamento: status === 2 ? forma : null })
    .eq('id', id);
  if (error) throw fail('Erro ao atualizar status', error);
}

export async function deletePedido(id: number): Promise<void> {
  const { error } = await supabase.from('pedidos_mercado').delete().eq('id', id);
  if (error) throw fail('Erro ao excluir pedido', error);
}

export async function getResumo(hoje: string): Promise<ResumoMercados> {
  const { data, error } = await supabase.rpc('resumo_mercados', { p_hoje: hoje });
  if (error) throw fail('Erro ao carregar resumo', error);
  return data as ResumoMercados;
}
