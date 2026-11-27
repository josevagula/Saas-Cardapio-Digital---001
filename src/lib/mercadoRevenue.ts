import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Faturamento dos pedidos de mercado (página Mercados), por dia — somado ao
// faturamento do delivery no Dashboard e no Analytics Avançado. Vem do RPC
// vendas_mercados_por_dia (uma linha por dia com venda, já agregada no banco).
//
// Pedido de mercado só tem data, não hora: entra nos totais e gráficos por
// dia, mas não no gráfico por hora, e não conta como "pedido" do delivery
// (ticket médio, recompra etc. continuam só do cardápio).

export interface MercadoDia { total: number; pedidos: number } // total em reais
export type MercadoRevenueByDay = Record<string, MercadoDia>; // chave YYYY-MM-DD local

const EMPTY: MercadoRevenueByDay = {};
let cache: MercadoRevenueByDay | null = null;
let inflight: Promise<MercadoRevenueByDay> | null = null;
const listeners = new Set<(v: MercadoRevenueByDay) => void>();

async function load(): Promise<MercadoRevenueByDay> {
  const { data, error } = await supabase.rpc('vendas_mercados_por_dia', { p_inicio: '2000-01-01', p_fim: '2100-12-31' });
  if (error) throw error;
  const map: MercadoRevenueByDay = {};
  (data || []).forEach((r: { data: string; total: number; pedidos: number }) => {
    map[r.data] = { total: Number(r.total) / 100, pedidos: r.pedidos };
  });
  return map;
}

function refresh() {
  if (inflight) return inflight;
  const owner = cacheOwner;
  inflight = load()
    .then(map => {
      if (owner !== cacheOwner) return map; // trocou de conta no meio
      cache = map;
      listeners.forEach(l => l(map));
      return map;
    })
    .catch(err => {
      console.error('Falha ao carregar vendas dos mercados:', err);
      return cache ?? EMPTY;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

// Chamado depois de salvar/excluir um pedido de mercado.
export function invalidateMercadoRevenue() {
  if (listeners.size > 0) refresh();
  else cache = null;
}

let cacheOwner: string | null = null;

// ownerId = id do usuário logado (null = desligado: demo/sem login). O
// cache é por conta, então trocar de login nunca mostra dados de outra.
export function useMercadoRevenueByDay(ownerId: string | null): MercadoRevenueByDay {
  const [value, setValue] = useState<MercadoRevenueByDay>(() => (ownerId && cacheOwner === ownerId && cache) || EMPTY);
  useEffect(() => {
    if (!ownerId) { setValue(EMPTY); return; }
    if (cacheOwner !== ownerId) { cache = null; cacheOwner = ownerId; }
    listeners.add(setValue);
    setValue(cache ?? EMPTY);
    refresh();
    return () => { listeners.delete(setValue); };
  }, [ownerId]);
  return value;
}

// Aplica os filtros do Dashboard: filtro por produto/cliente do cardápio
// exclui os mercados (não são vendas daquele produto/cliente); o filtro de
// data limita os dias.
export function filterMercadoRevenue(
  map: MercadoRevenueByDay,
  f: { productId: string; customer: string },
  range: { start: Date; end: Date } | null
): MercadoRevenueByDay {
  if (f.productId || f.customer.trim()) return EMPTY;
  if (!range) return map;
  const a = keyOf(range.start);
  const b = keyOf(range.end);
  const out: MercadoRevenueByDay = {};
  for (const k in map) if (k >= a && k <= b) out[k] = map[k];
  return out;
}

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Soma dos mercados entre dois dias (inclusive), em reais.
export function mercadoTotalBetween(map: MercadoRevenueByDay, start: Date, end: Date): number {
  const a = keyOf(start);
  const b = keyOf(end);
  let total = 0;
  for (const k in map) if (k >= a && k <= b) total += map[k].total;
  return Math.round(total * 100) / 100;
}

export function mercadoDia(map: MercadoRevenueByDay, day: Date): number {
  return map[keyOf(day)]?.total ?? 0;
}

// Uma série diária consecutiva começando em `start` (como as do Dashboard e
// do Analytics): devolve o valor de mercado de cada posição.
export function mercadoSeries(map: MercadoRevenueByDay, start: Date, length: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    out.push(map[keyOf(d)]?.total ?? 0);
  }
  return out;
}
