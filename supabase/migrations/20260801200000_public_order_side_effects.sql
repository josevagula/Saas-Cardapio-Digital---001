-- Lets an anonymous public-menu checkout update a product's sales_count and
-- upsert the customer's loyalty record, without granting anon a general
-- UPDATE/INSERT on products or customers (which would let a stranger
-- rewrite any product's price/name, or tamper with another customer's
-- loyalty points). Each function only performs the one narrow, well-defined
-- write it's named for.

create or replace function public.increment_product_sales(p_user_id uuid, p_product_id text, p_quantity integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
  set sales_count = sales_count + p_quantity
  where user_id = p_user_id and id = p_product_id;
$$;

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
  set loyalty_points = loyalty_points + p_points,
      order_count = order_count + 1,
      last_order_date = current_date
  where user_id = p_user_id and phone = p_phone;

  if not found then
    insert into public.customers (id, user_id, name, phone, email, address, loyalty_points, order_count, last_order_date)
    values (
      'cust-' || floor(random() * 900 + 100)::text,
      p_user_id, p_name, p_phone, nullif(p_email, ''), nullif(p_address, ''), p_points, 1, current_date
    );
  end if;
end;
$$;

revoke all on function public.increment_product_sales(uuid, text, integer) from public;
grant execute on function public.increment_product_sales(uuid, text, integer) to anon, authenticated;

revoke all on function public.record_customer_order(uuid, text, text, text, text, integer) from public;
grant execute on function public.record_customer_order(uuid, text, text, text, text, integer) to anon, authenticated;
