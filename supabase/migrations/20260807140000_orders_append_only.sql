-- Orders are a permanent sales record for the account. Once created, the
-- app must never be able to delete one, even indirectly (stale local
-- browser state, a bug in the workspace sync mirror, a compromised
-- client). Replace the single "owner can do anything" policy with
-- select/insert/update-only policies — no delete policy at all, and RLS
-- defaults to deny — then revoke the DELETE grant as a second layer so
-- deletion isn't possible even through a direct PostgREST call.
drop policy "orders_owner_all" on public.orders;

create policy "orders_owner_select" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders_owner_insert" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "orders_owner_update" on public.orders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke delete on public.orders from authenticated, anon;
