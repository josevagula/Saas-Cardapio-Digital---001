-- Supabase auto-grants EXECUTE on newly created public-schema functions to
-- anon/authenticated/service_role directly (not merely via the PUBLIC
-- pseudo-role), so a plain "revoke ... from public" does not remove anon's
-- access — confirmed via pg_proc.proacl after the previous migration.
-- Tighten explicitly here:
--   * sync_order_revenue / remove_order_revenue: admin-only actions
--     (called from the authenticated dashboard when an order's status
--     changes), never meant to be reachable by the anonymous public menu.
--   * the three financial_transactions trigger functions: must only ever
--     run via their triggers (which don't require EXECUTE on the invoking
--     role), never callable directly as an RPC by anyone.
revoke execute on function public.sync_order_revenue(uuid, text, text, text, numeric, text, date) from anon, authenticated, public;
grant execute on function public.sync_order_revenue(uuid, text, text, text, numeric, text, date) to authenticated;

revoke execute on function public.remove_order_revenue(uuid, text) from anon, authenticated, public;
grant execute on function public.remove_order_revenue(uuid, text) to authenticated;

revoke execute on function public.sync_financial_transaction_from_revenue() from anon, authenticated, public;
revoke execute on function public.sync_financial_transaction_from_expense() from anon, authenticated, public;
revoke execute on function public.sync_financial_transaction_from_adjustment() from anon, authenticated, public;
