-- Per-restaurant sequential order numbers (PED-0001, PED-0002, ...), shown
-- in the admin order management screen instead of the random internal id.
-- Assigned in a second step after the order row is inserted (not baked into
-- the id itself), since the public checkout is anonymous, fire-and-forget,
-- and must never block the customer's confirmation screen on a network
-- round-trip just to mint a number.

alter table public.orders add column if not exists order_number integer;

create table if not exists public.order_counters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  next_number integer not null default 1
);

alter table public.order_counters enable row level security;

create policy "order_counters_owner_select" on public.order_counters
  for select using (auth.uid() = user_id);

-- Atomically hands out the next number for this restaurant and stamps it on
-- the given order. SECURITY DEFINER + narrow grant, same pattern as
-- increment_product_sales/record_customer_order: anon has no general
-- UPDATE grant on orders or order_counters, so a stranger can't renumber or
-- tamper with another restaurant's orders.
--
-- Raises if the order row isn't there yet (insert_public_order landed after
-- this call), so retryUntilSuccess on the client just retries until it is —
-- the counter itself has already moved on, so no number is reused.
create or replace function public.assign_order_number(p_user_id uuid, p_order_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.order_counters (user_id, next_number)
  values (p_user_id, 2)
  on conflict (user_id) do update set next_number = order_counters.next_number + 1
  returning next_number - 1 into v_number;

  update public.orders
  set order_number = v_number
  where id = p_order_id and user_id = p_user_id;

  if not found then
    raise exception 'order % not found yet for user %', p_order_id, p_user_id;
  end if;

  return v_number;
end;
$$;

revoke all on function public.assign_order_number(uuid, text) from public;
grant execute on function public.assign_order_number(uuid, text) to anon, authenticated;
