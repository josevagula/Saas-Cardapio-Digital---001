-- The project's default privileges auto-grant EXECUTE to anon on every new
-- function (that's why increment_product_sales/record_customer_order/
-- assign_order_number are anon-callable on purpose) — so the previous
-- migration's "revoke all from public; grant to authenticated" didn't
-- actually strip anon's separately-granted default privilege. These three
-- are admin-only actions (crediting/reversing/redeeming a customer's own
-- loyalty balance) and must never be callable by an anonymous public-menu
-- visitor.
revoke execute on function public.credit_order_loyalty(uuid, text, text, text, integer, text) from anon;
revoke execute on function public.reverse_order_loyalty(uuid, text, text, integer, text) from anon;
revoke execute on function public.redeem_loyalty_reward(uuid, text, integer, text, numeric, text, text) from anon;
