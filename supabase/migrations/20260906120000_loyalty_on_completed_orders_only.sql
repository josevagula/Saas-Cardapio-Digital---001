-- Loyalty points and the order count must reflect real, completed business
-- (orders marked 'delivered' by the restaurant), not just orders placed —
-- a cancelled or still-in-progress order shouldn't count. Crediting now
-- happens client-side in the admin dashboard (AppContext.updateOrderStatus,
-- via the customers_owner_all RLS policy) when an order transitions to
-- 'delivered', and is reversed if it's later cancelled/reverted. This
-- function, called anonymously at checkout on the public menu, therefore no
-- longer touches loyalty_points/order_count — it only keeps the customer's
-- contact profile (name/email/address) up to date, or creates the profile
-- with zero loyalty if this is their first order.
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
  update public.customers
  set name = p_name,
      email = coalesce(nullif(p_email, ''), email),
      address = coalesce(nullif(p_address, ''), address)
  where user_id = p_user_id and phone = p_phone;

  if not found then
    insert into public.customers (id, user_id, name, phone, email, address, loyalty_points, order_count, last_order_date)
    values (
      'cust-' || floor(random() * 900 + 100)::text,
      p_user_id, p_name, p_phone, nullif(p_email, ''), nullif(p_address, ''), 0, 0, null
    );
  end if;
end;
$$;
