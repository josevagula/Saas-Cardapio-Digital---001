-- Full Financeiro module: Receitas, Despesas, Fluxo de Caixa, DRE. Purely
-- additive — no existing table, column, policy or function is touched.
-- Follows the same pattern as 20260908130000_loyalty_ledger_and_atomic_ops.sql:
-- owner-scoped RLS everywhere, SECURITY DEFINER RPCs for the automatic
-- order -> revenue sync (mirroring credit_order_loyalty/reverse_order_loyalty).

-- ---------------------------------------------------------------------
-- 1) revenues — manual entries + one row per delivered order (automatic)
-- ---------------------------------------------------------------------
create table public.revenues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  category text not null check (category in ('pedidos_online', 'delivery', 'balcao', 'salao', 'outros')),
  amount numeric not null check (amount > 0),
  occurred_at date not null,
  payment_method text,
  origin text not null default 'manual' check (origin in ('manual', 'pedido_automatico')),
  order_id text references public.orders (id),
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An automatic revenue always carries its order_id and vice versa — keeps
  -- the two concepts from drifting apart under manual edits.
  check ((origin = 'pedido_automatico') = (order_id is not null))
);

-- At most one automatic revenue per order, even under concurrent status
-- updates (two admin tabs marking the same order delivered at once) — this
-- is what actually guarantees "no duplication", not just app-side logic.
create unique index revenues_order_unique on public.revenues (user_id, order_id) where order_id is not null;
create index revenues_user_occurred_idx on public.revenues (user_id, occurred_at desc);
create index revenues_user_category_idx on public.revenues (user_id, category);

alter table public.revenues enable row level security;

create policy "revenues_owner_all" on public.revenues
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 2) expenses
-- ---------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  category text not null check (category in (
    'aluguel', 'fornecedores', 'funcionarios', 'marketing', 'energia',
    'agua', 'internet', 'impostos', 'equipamentos', 'outros'
  )),
  amount numeric not null check (amount > 0),
  due_date date not null,
  paid_date date,
  -- Only two real states are stored. "Atrasado" is derived at query/UI time
  -- (status = 'pendente' and due_date < current_date) instead of being a
  -- third stored value, which would silently go stale the moment a due
  -- date passes without anyone touching the row.
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'pendente' or paid_date is not null)
);

create index expenses_user_due_idx on public.expenses (user_id, due_date);
create index expenses_user_status_idx on public.expenses (user_id, status);

alter table public.expenses enable row level security;

create policy "expenses_owner_all" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3) cash_adjustments — manual positive/negative cash movements
-- ---------------------------------------------------------------------
create table public.cash_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  amount numeric not null, -- signed: positive = entrada, negative = saída
  occurred_at date not null,
  created_at timestamptz not null default now()
);

create index cash_adjustments_user_occurred_idx on public.cash_adjustments (user_id, occurred_at desc);

alter table public.cash_adjustments enable row level security;

create policy "cash_adjustments_owner_all" on public.cash_adjustments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4) finance_settings — one row per account (saldo inicial, food cost %)
-- ---------------------------------------------------------------------
create table public.finance_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  initial_balance numeric not null default 0,
  initial_balance_date date not null default current_date,
  cogs_percent numeric not null default 35,
  updated_at timestamptz not null default now()
);

alter table public.finance_settings enable row level security;

create policy "finance_settings_owner_all" on public.finance_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5) financial_transactions — append-only cash-movement ledger, entirely
-- maintained by triggers below so every write path (today's RPCs, direct
-- CRUD on revenues/expenses, future features) keeps it consistent without
-- having to remember to do so. Not writable directly by clients.
-- ---------------------------------------------------------------------
create table public.financial_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  amount numeric not null check (amount > 0),
  source text not null check (source in ('revenue', 'expense', 'adjustment')),
  source_id uuid not null,
  description text not null,
  category text,
  occurred_at date not null,
  created_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

create index financial_transactions_user_occurred_idx on public.financial_transactions (user_id, occurred_at desc);

alter table public.financial_transactions enable row level security;

create policy "financial_transactions_owner_select" on public.financial_transactions
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.financial_transactions from authenticated, anon;

-- ---------------------------------------------------------------------
-- 6) dre_reports — closed-period DRE snapshots (history/comparatives).
-- The live DRE screen always computes fresh; this only stores what the
-- user explicitly "closes", so historical periods never shift underfoot.
-- ---------------------------------------------------------------------
create table public.dre_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_type text not null check (period_type in ('mensal', 'trimestral', 'anual')),
  period_start date not null,
  period_end date not null,
  breakdown jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, period_type, period_start)
);

alter table public.dre_reports enable row level security;

create policy "dre_reports_owner_all" on public.dre_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 7) Triggers keeping financial_transactions in sync
-- ---------------------------------------------------------------------
create or replace function public.sync_financial_transaction_from_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.financial_transactions
    where user_id = old.user_id and source = 'revenue' and source_id = old.id;
    return old;
  end if;

  insert into public.financial_transactions
    (user_id, direction, amount, source, source_id, description, category, occurred_at)
  values
    (new.user_id, 'in', new.amount, 'revenue', new.id, new.description, new.category, new.occurred_at)
  on conflict (user_id, source, source_id) do update
    set amount = excluded.amount,
        description = excluded.description,
        category = excluded.category,
        occurred_at = excluded.occurred_at;
  return new;
end;
$$;

create trigger revenues_sync_financial_transaction
  after insert or update or delete on public.revenues
  for each row execute function public.sync_financial_transaction_from_revenue();

create or replace function public.sync_financial_transaction_from_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.financial_transactions
    where user_id = old.user_id and source = 'expense' and source_id = old.id;
    return old;
  end if;

  if new.status = 'pago' and new.paid_date is not null then
    insert into public.financial_transactions
      (user_id, direction, amount, source, source_id, description, category, occurred_at)
    values
      (new.user_id, 'out', new.amount, 'expense', new.id, new.description, new.category, new.paid_date)
    on conflict (user_id, source, source_id) do update
      set amount = excluded.amount,
          description = excluded.description,
          category = excluded.category,
          occurred_at = excluded.occurred_at;
  else
    delete from public.financial_transactions
    where user_id = new.user_id and source = 'expense' and source_id = new.id;
  end if;
  return new;
end;
$$;

create trigger expenses_sync_financial_transaction
  after insert or update or delete on public.expenses
  for each row execute function public.sync_financial_transaction_from_expense();

create or replace function public.sync_financial_transaction_from_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.financial_transactions
    where user_id = old.user_id and source = 'adjustment' and source_id = old.id;
    return old;
  end if;

  insert into public.financial_transactions
    (user_id, direction, amount, source, source_id, description, category, occurred_at)
  values
    (new.user_id, case when new.amount >= 0 then 'in' else 'out' end, abs(new.amount), 'adjustment', new.id, new.description, null, new.occurred_at)
  on conflict (user_id, source, source_id) do update
    set direction = excluded.direction,
        amount = excluded.amount,
        description = excluded.description,
        occurred_at = excluded.occurred_at;
  return new;
end;
$$;

create trigger cash_adjustments_sync_financial_transaction
  after insert or update or delete on public.cash_adjustments
  for each row execute function public.sync_financial_transaction_from_adjustment();

-- ---------------------------------------------------------------------
-- 8) cash_flow_daily — Entradas x Saídas per day, read straight off the
-- ledger. security_invoker so it enforces the QUERYING user's RLS on
-- financial_transactions, not the view owner's.
-- ---------------------------------------------------------------------
create view public.cash_flow_daily
with (security_invoker = true) as
select
  user_id,
  occurred_at,
  coalesce(sum(amount) filter (where direction = 'in'), 0) as inflow,
  coalesce(sum(amount) filter (where direction = 'out'), 0) as outflow,
  coalesce(sum(amount) filter (where direction = 'in'), 0) - coalesce(sum(amount) filter (where direction = 'out'), 0) as net
from public.financial_transactions
group by user_id, occurred_at;

grant select on public.cash_flow_daily to authenticated;

-- ---------------------------------------------------------------------
-- 9) sync_order_revenue / remove_order_revenue — the automatic order ->
-- revenue bridge, called when an order reaches/leaves 'delivered'.
-- Idempotent via the (user_id, order_id) unique index itself: a retried
-- call for the same order just upserts the same row. Never overwrites a
-- revenue the owner has manually adopted (is_manual_override = true).
-- ---------------------------------------------------------------------
create or replace function public.sync_order_revenue(
  p_user_id uuid,
  p_order_id text,
  p_description text,
  p_category text,
  p_amount numeric,
  p_payment_method text,
  p_occurred_at date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  insert into public.revenues
    (user_id, description, category, amount, occurred_at, payment_method, origin, order_id)
  values
    (p_user_id, p_description, p_category, p_amount, p_occurred_at, p_payment_method, 'pedido_automatico', p_order_id)
  on conflict (user_id, order_id) where order_id is not null
  do update set
    description = excluded.description,
    category = excluded.category,
    amount = excluded.amount,
    occurred_at = excluded.occurred_at,
    payment_method = excluded.payment_method,
    updated_at = now()
  where public.revenues.is_manual_override = false
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.revenues where user_id = p_user_id and order_id = p_order_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.remove_order_revenue(
  p_user_id uuid,
  p_order_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  delete from public.revenues
  where user_id = p_user_id
    and order_id = p_order_id
    and origin = 'pedido_automatico'
    and is_manual_override = false;
end;
$$;

revoke all on function public.sync_order_revenue(uuid, text, text, text, numeric, text, date) from public;
grant execute on function public.sync_order_revenue(uuid, text, text, text, numeric, text, date) to authenticated;

revoke all on function public.remove_order_revenue(uuid, text) from public;
grant execute on function public.remove_order_revenue(uuid, text) to authenticated;
