-- Requested by the account owner: cancelled orders need to be actually
-- deletable, not just hidden from the local view (20260807140000 revoked
-- DELETE entirely as a safety net against accidental/buggy data loss).
-- Narrow that back open just enough for the dashboard's "excluir pedido"
-- button to work — the owner can delete their own orders, but only ones
-- already in the 'cancelled' status, so active sales records stay
-- protected.
create policy "orders_owner_delete_cancelled" on public.orders
  for delete using (auth.uid() = user_id and status = 'cancelled');

grant delete on public.orders to authenticated;
