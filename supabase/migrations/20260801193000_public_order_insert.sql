-- Lets an anonymous customer's checkout on a public menu link actually
-- reach the restaurant's Supabase orders table. Scoped to only allow
-- inserting an order for a user_id that has a real, configured
-- visual_configs row (an actual restaurant account) — anonymous customers
-- still can't select, update, or delete any order (see
-- orders_owner_all from the earlier migration), only create new ones.
create policy "orders_public_insert" on public.orders
  for insert
  with check (
    exists (select 1 from public.visual_configs vc where vc.user_id = orders.user_id)
  );
