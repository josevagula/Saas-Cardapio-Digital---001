-- Restructures loyalty point crediting/reversal/redemption to be
-- deterministic and race-safe, per the Clube de Fidelidade rules:
--   pontos = valor_gasto / valor_configurado (already correct client-side,
--   see src/utils/loyalty.ts), accumulated across orders, never duplicated,
--   never lost, redemption subtracts the goal (not a full reset), and every
-- movement is logged so nothing about a customer's balance is a guess.
--
-- Nothing existing is dropped or renamed — purely additive: one new unique
-- constraint (verified against production to have zero existing violators),
-- one new table, and new/updated SECURITY DEFINER functions.

-- 1) A customer is uniquely identified by (account, phone) — already the
-- convention every call site follows, but until now nothing in the database
-- actually enforced it, so two concurrent "first order from this phone"
-- inserts could have raced into two separate customer rows. Verified there
-- are zero existing (user_id, phone) duplicates in production before adding
-- this, so it is safe to add without touching any existing row.
alter table public.customers
  add constraint customers_user_id_phone_key unique (user_id, phone);

-- 2) Append-only ledger: every points movement (earned on delivery, clawed
-- back on cancel/status-revert, spent on redemption) with the balance
-- before/after, so a customer's current loyalty_points is always
-- reconstructable and auditable, never just a trusted running counter.
create table public.loyalty_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_phone text not null,
  order_id text,
  type text not null check (type in ('earn', 'reversal', 'redeem')),
  points_delta integer not null,
  balance_before integer not null,
  balance_after integer not null,
  reward_snapshot jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now()
);

alter table public.loyalty_ledger enable row level security;

create policy "loyalty_ledger_owner_all" on public.loyalty_ledger
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index loyalty_ledger_user_created_idx on public.loyalty_ledger (user_id, created_at desc);
create index loyalty_ledger_customer_phone_idx on public.loyalty_ledger (user_id, customer_phone, created_at desc);

-- A retried call (network hiccup after the write already landed) replays
-- the same idempotency_key and must be a no-op, not a second movement — see
-- the "found" early-return in each function below.
create unique index loyalty_ledger_idempotency_key_idx on public.loyalty_ledger (user_id, idempotency_key);

-- 3) record_customer_order (called anonymously at public checkout) only
-- ever touched contact info as of 20260906120000 — this just closes the
-- update-then-insert-if-not-found race between two concurrent first orders
-- from the same phone by using the new unique constraint atomically instead.
create or replace function public.record_customer_order(
  p_user_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_points integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (id, user_id, name, phone, email, address, loyalty_points, order_count, last_order_date)
  values (
    'cust-' || floor(random() * 900 + 100)::text,
    p_user_id, p_name, p_phone, nullif(p_email, ''), nullif(p_address, ''), 0, 0, null
  )
  on conflict (user_id, phone) do update
    set name = excluded.name,
        email = coalesce(excluded.email, public.customers.email),
        address = coalesce(excluded.address, public.customers.address);
end;
$$;

-- 4) Atomically credits the points a just-delivered order earned. Idempotent
-- on p_idempotency_key (build it from the order id + the transition, e.g.
-- "<orderId>:earn:<timestamp>", once per call site invocation) so a retried
-- attempt after a lost response can never double-credit — but a genuinely
-- new delivery of the same order later in its lifecycle (delivered ->
-- reverted -> delivered again) still earns again, since that gets a fresh
-- key. Only the account owner may call this for their own customers —
-- SECURITY DEFINER bypasses RLS, so this check stands in for it.
create or replace function public.credit_order_loyalty(
  p_user_id uuid,
  p_order_id text,
  p_customer_name text,
  p_customer_phone text,
  p_points integer,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replay_balance integer;
  v_balance_before integer;
  v_balance_after integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  select balance_after into v_replay_balance
  from public.loyalty_ledger
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return v_replay_balance;
  end if;

  insert into public.customers (id, user_id, name, phone, loyalty_points, order_count, last_order_date)
  values ('cust-' || floor(random() * 900 + 100)::text, p_user_id, p_customer_name, p_customer_phone, 0, 0, null)
  on conflict (user_id, phone) do nothing;

  update public.customers
  set loyalty_points = loyalty_points + p_points,
      order_count = order_count + 1,
      last_order_date = current_date
  where user_id = p_user_id and phone = p_customer_phone
  returning loyalty_points - p_points, loyalty_points into v_balance_before, v_balance_after;

  insert into public.loyalty_ledger
    (user_id, customer_phone, order_id, type, points_delta, balance_before, balance_after, idempotency_key)
  values
    (p_user_id, p_customer_phone, p_order_id, 'earn', p_points, v_balance_before, v_balance_after, p_idempotency_key);

  return v_balance_after;
end;
$$;

-- 5) The exact inverse — claws back points from a delivered order that was
-- cancelled or reverted to an earlier stage. Same idempotency guarantee.
create or replace function public.reverse_order_loyalty(
  p_user_id uuid,
  p_order_id text,
  p_customer_phone text,
  p_points integer,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replay_balance integer;
  v_balance_before integer;
  v_balance_after integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  select balance_after into v_replay_balance
  from public.loyalty_ledger
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return v_replay_balance;
  end if;

  -- Locks the row before computing the clamp, so balance_before/after in the
  -- ledger stay exact even when p_points would take the balance below zero
  -- (e.g. some of it was already spent on a redemption since it was earned)
  -- — a plain "RETURNING loyalty_points + p_points" would misreport
  -- balance_before once greatest(0, ...) actually clamps.
  select loyalty_points into v_balance_before
  from public.customers
  where user_id = p_user_id and phone = p_customer_phone
  for update;

  if not found then
    return 0;
  end if;

  v_balance_after := greatest(0, v_balance_before - p_points);

  update public.customers
  set loyalty_points = v_balance_after,
      order_count = greatest(0, order_count - 1)
  where user_id = p_user_id and phone = p_customer_phone;

  insert into public.loyalty_ledger
    (user_id, customer_phone, order_id, type, points_delta, balance_before, balance_after, idempotency_key)
  values
    (p_user_id, p_customer_phone, p_order_id, 'reversal', v_balance_after - v_balance_before, v_balance_before, v_balance_after, p_idempotency_key);

  return v_balance_after;
end;
$$;

-- 6) Redemption: atomically subtracts the reward's point cost — never a
-- full reset to zero, so points earned beyond the goal carry over — and
-- only succeeds if the balance still covers it at the moment the UPDATE
-- actually runs. That WHERE clause is what makes two simultaneous redeem
-- clicks safe: Postgres serializes the two UPDATEs on the same row, so the
-- second one re-reads the balance the first one just left and fails
-- cleanly instead of over-redeeming.
create or replace function public.redeem_loyalty_reward(
  p_user_id uuid,
  p_customer_phone text,
  p_points_cost integer,
  p_reward_label text,
  p_reward_value numeric,
  p_reward_type text,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replay_balance integer;
  v_balance_before integer;
  v_balance_after integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  select balance_after into v_replay_balance
  from public.loyalty_ledger
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return v_replay_balance;
  end if;

  update public.customers
  set loyalty_points = loyalty_points - p_points_cost
  where user_id = p_user_id and phone = p_customer_phone and loyalty_points >= p_points_cost
  returning loyalty_points + p_points_cost, loyalty_points into v_balance_before, v_balance_after;

  if not found then
    raise exception 'insufficient_points';
  end if;

  insert into public.loyalty_ledger
    (user_id, customer_phone, order_id, type, points_delta, balance_before, balance_after, reward_snapshot, idempotency_key)
  values
    (p_user_id, p_customer_phone, null, 'redeem', -p_points_cost, v_balance_before, v_balance_after,
     jsonb_build_object('label', p_reward_label, 'value', p_reward_value, 'type', p_reward_type),
     p_idempotency_key);

  return v_balance_after;
end;
$$;

revoke all on function public.credit_order_loyalty(uuid, text, text, text, integer, text) from public;
grant execute on function public.credit_order_loyalty(uuid, text, text, text, integer, text) to authenticated;

revoke all on function public.reverse_order_loyalty(uuid, text, text, integer, text) from public;
grant execute on function public.reverse_order_loyalty(uuid, text, text, integer, text) to authenticated;

revoke all on function public.redeem_loyalty_reward(uuid, text, integer, text, numeric, text, text) from public;
grant execute on function public.redeem_loyalty_reward(uuid, text, integer, text, numeric, text, text) to authenticated;
