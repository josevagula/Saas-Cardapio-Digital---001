-- Relatórios de vendas para mercados, calculados na hora (sem tabelas de
-- resumo). Usados pela aba "Vendas" da página Mercados e para somar o
-- faturamento dos mercados no Dashboard e no Analytics Avançado.
-- SECURITY INVOKER: o RLS de pedidos_mercado limita ao dono logado.
-- Todo pedido de mercado conta como vendido (não existe status cancelado).

create or replace function public.vendas_mercados_por_dia(p_inicio date, p_fim date)
returns table (data date, total bigint, pedidos integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.data, sum(p.total_centavos)::bigint, count(*)::int
    from public.pedidos_mercado p
   where p.data between p_inicio and p_fim
   group by p.data
   order by p.data;
$$;

create or replace function public.vendas_mercados_por_mercado(p_inicio date, p_fim date)
returns table (mercado_id bigint, total bigint, pago bigint, pedidos integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.mercado_id,
         sum(p.total_centavos)::bigint,
         coalesce(sum(p.total_centavos) filter (where p.status = 2), 0)::bigint,
         count(*)::int
    from public.pedidos_mercado p
   where p.data between p_inicio and p_fim
   group by p.mercado_id
   order by 2 desc;
$$;

revoke all on function public.vendas_mercados_por_dia(date, date) from public, anon;
revoke all on function public.vendas_mercados_por_mercado(date, date) from public, anon;
grant execute on function public.vendas_mercados_por_dia(date, date) to authenticated;
grant execute on function public.vendas_mercados_por_mercado(date, date) to authenticated;
