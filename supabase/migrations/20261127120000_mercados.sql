-- Módulo "Mercados": venda de revenda/atacado para supermercados.
-- Puramente aditivo — nenhuma tabela, policy ou função existente é tocada.
-- Nenhum dado é inserido (sem seed): tudo começa vazio.
--
-- Pensado para ocupar o mínimo de espaço:
--  * ids bigint identity (não uuid), dinheiro em centavos (integer),
--    quantidade smallint, datas como date, status/forma como smallint;
--  * sem created_at/updated_at; nada que dê para calcular é guardado
--    (total da linha = qtd × preço é calculado na tela);
--  * user_id (dono, padrão do projeto) só em mercados e pedidos_mercado —
--    produtos_mercado e itens_pedido herdam o dono pelo pai via RLS,
--    economizando 16 bytes por linha nas tabelas que mais crescem.
--
-- Códigos:
--   pedidos_mercado.status:          0 = Pendente, 1 = Entregue, 2 = Pago
--   pedidos_mercado.forma_pagamento: 0 = Pix, 1 = Dinheiro, 2 = Boleto,
--                                    3 = Cartão, 4 = Transferência, 5 = Outro

create table public.mercados (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  cidade text,
  contato text,
  telefone text,
  ativo boolean not null default true,
  obs text
);
create index mercados_user_idx on public.mercados (user_id);

create table public.produtos_mercado (
  id bigint generated always as identity primary key,
  mercado_id bigint not null references public.mercados (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  preco_centavos integer not null check (preco_centavos >= 0),
  ativo boolean not null default true,
  ordem smallint not null default 0
);
create index produtos_mercado_mercado_idx on public.produtos_mercado (mercado_id);

create table public.pedidos_mercado (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mercado_id bigint not null references public.mercados (id) on delete cascade,
  data date not null default current_date,
  status smallint not null default 0 check (status between 0 and 2),
  pago_em date,
  forma_pagamento smallint check (forma_pagamento between 0 and 5),
  total_centavos integer not null default 0 check (total_centavos >= 0)
);
create index pedidos_mercado_mercado_data_idx on public.pedidos_mercado (mercado_id, data);

-- A chave primária (pedido_id, produto_id) já serve de índice por pedido_id.
create table public.itens_pedido (
  pedido_id bigint not null references public.pedidos_mercado (id) on delete cascade,
  produto_id bigint not null references public.produtos_mercado (id),
  qtd smallint not null check (qtd > 0),
  preco_centavos integer not null check (preco_centavos >= 0),
  primary key (pedido_id, produto_id)
);
-- Necessário para a FK de produto não fazer varredura completa.
create index itens_pedido_produto_idx on public.itens_pedido (produto_id);

-- ---------------------------------------------------------------------
-- RLS: cada delivery (dono da conta) só vê e altera os próprios dados.
-- ---------------------------------------------------------------------
alter table public.mercados enable row level security;
alter table public.produtos_mercado enable row level security;
alter table public.pedidos_mercado enable row level security;
alter table public.itens_pedido enable row level security;

create policy "mercados_owner_all" on public.mercados
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "produtos_mercado_owner_all" on public.produtos_mercado
  for all
  using (exists (select 1 from public.mercados m where m.id = mercado_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.mercados m where m.id = mercado_id and m.user_id = (select auth.uid())));

-- O pedido precisa ser de um mercado do próprio dono.
create policy "pedidos_mercado_owner_all" on public.pedidos_mercado
  for all
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.mercados m where m.id = mercado_id and m.user_id = (select auth.uid()))
  );

-- O item precisa estar num pedido do dono e apontar para um produto do dono.
create policy "itens_pedido_owner_all" on public.itens_pedido
  for all
  using (exists (select 1 from public.pedidos_mercado p where p.id = pedido_id and p.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.pedidos_mercado p where p.id = pedido_id and p.user_id = (select auth.uid()))
    and exists (
      select 1 from public.produtos_mercado pr join public.mercados m on m.id = pr.mercado_id
      where pr.id = produto_id and m.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.mercados, public.produtos_mercado, public.pedidos_mercado, public.itens_pedido to authenticated;

-- ---------------------------------------------------------------------
-- salvar_pedido_mercado: cria ou atualiza um pedido e seus itens numa
-- única transação. O total é calculado aqui, a partir dos itens, então
-- total_centavos nunca diverge das linhas. Itens com qtd 0 são ignorados.
-- SECURITY INVOKER: todas as policies acima continuam valendo.
--   p_itens: [{"produto_id": 1, "qtd": 3, "preco_centavos": 4200}, ...]
-- ---------------------------------------------------------------------
create or replace function public.salvar_pedido_mercado(
  p_pedido_id bigint,
  p_mercado_id bigint,
  p_data date,
  p_itens jsonb
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
  v_total integer;
begin
  select coalesce(sum((i->>'qtd')::int * (i->>'preco_centavos')::int), 0)::integer
    into v_total
    from jsonb_array_elements(p_itens) i
   where (i->>'qtd')::int > 0;

  if v_total is null or not exists (select 1 from jsonb_array_elements(p_itens) i where (i->>'qtd')::int > 0) then
    raise exception 'pedido_vazio';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) i where (i->>'qtd')::int < 0 or (i->>'preco_centavos')::int < 0) then
    raise exception 'valor_negativo';
  end if;

  if p_pedido_id is null then
    insert into public.pedidos_mercado (mercado_id, data, total_centavos)
    values (p_mercado_id, coalesce(p_data, current_date), v_total)
    returning id into v_id;
  else
    update public.pedidos_mercado
       set mercado_id = p_mercado_id, data = coalesce(p_data, data), total_centavos = v_total
     where id = p_pedido_id
    returning id into v_id;
    if v_id is null then
      raise exception 'pedido_nao_encontrado';
    end if;
    delete from public.itens_pedido where pedido_id = v_id;
  end if;

  insert into public.itens_pedido (pedido_id, produto_id, qtd, preco_centavos)
  select v_id, (i->>'produto_id')::bigint, sum((i->>'qtd')::int)::smallint, max((i->>'preco_centavos')::int)
    from jsonb_array_elements(p_itens) i
   where (i->>'qtd')::int > 0
   group by (i->>'produto_id')::bigint;

  return v_id;
end;
$$;

revoke all on function public.salvar_pedido_mercado(bigint, bigint, date, jsonb) from public, anon;
grant execute on function public.salvar_pedido_mercado(bigint, bigint, date, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- resumo_mercados: tudo do painel numa só chamada, calculado na hora —
-- sem tabelas de resumo. SECURITY INVOKER (RLS filtra pelo dono).
-- p_hoje vem do navegador (dia local do restaurante, não UTC).
-- Rankings consideram o mês corrente.
-- ---------------------------------------------------------------------
create or replace function public.resumo_mercados(p_hoje date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  semana as (select (p_hoje - ((extract(isodow from p_hoje)::int) - 1)) as ini),
  mes as (select date_trunc('month', p_hoje)::date as ini),
  peds as (
    select p.id, p.mercado_id, p.data, p.status, p.total_centavos
      from public.pedidos_mercado p
     where p.data >= least((select ini from semana), (select ini from mes))
        or p.status = 1
  )
  select jsonb_build_object(
    'dia',        coalesce((select sum(total_centavos) from peds where data = p_hoje), 0),
    'semana',     coalesce((select sum(total_centavos) from peds where data between (select ini from semana) and p_hoje), 0),
    'mes',        coalesce((select sum(total_centavos) from peds where data between (select ini from mes) and p_hoje), 0),
    'pedidos_dia', (select count(*) from peds where data = p_hoje),
    'pedidos_mes', (select count(*) from peds where data between (select ini from mes) and p_hoje),
    'a_receber',  coalesce((select sum(total_centavos) from peds where status = 1), 0),
    'devendo', coalesce((
      select jsonb_agg(jsonb_build_object('mercado_id', mercado_id, 'total', total, 'pedidos', n) order by total desc)
        from (select mercado_id, sum(total_centavos) as total, count(*) as n from peds where status = 1 group by mercado_id) d
    ), '[]'::jsonb),
    'producao_dia', coalesce((
      select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd) order by qtd desc, nome)
        from (
          select min(pr.nome) as nome, sum(i.qtd)::int as qtd
            from peds p
            join public.itens_pedido i on i.pedido_id = p.id
            join public.produtos_mercado pr on pr.id = i.produto_id
           where p.data = p_hoje
           group by lower(btrim(pr.nome))
        ) x
    ), '[]'::jsonb),
    'ranking_mercados', coalesce((
      select jsonb_agg(jsonb_build_object('mercado_id', mercado_id, 'total', total, 'pedidos', n) order by total desc)
        from (
          select mercado_id, sum(total_centavos) as total, count(*) as n
            from peds where data between (select ini from mes) and p_hoje
           group by mercado_id order by total desc limit 10
        ) r
    ), '[]'::jsonb),
    'ranking_produtos', coalesce((
      select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd, 'total', total) order by qtd desc)
        from (
          select min(pr.nome) as nome, sum(i.qtd)::int as qtd, sum(i.qtd * i.preco_centavos)::bigint as total
            from peds p
            join public.itens_pedido i on i.pedido_id = p.id
            join public.produtos_mercado pr on pr.id = i.produto_id
           where p.data between (select ini from mes) and p_hoje
           group by lower(btrim(pr.nome))
           order by qtd desc limit 10
        ) r
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.resumo_mercados(date) from public, anon;
grant execute on function public.resumo_mercados(date) to authenticated;
