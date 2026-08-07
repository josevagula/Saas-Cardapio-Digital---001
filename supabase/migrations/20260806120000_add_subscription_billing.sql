-- Real Stripe billing state for each account, replacing the old
-- localStorage-only "sushi_plan_status" mock. Written exclusively by the
-- trusted Express server (checkout/portal routes + Stripe webhook) using the
-- service role key, which bypasses RLS — client code never writes these.
alter table public.profiles
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column subscription_status text not null default 'trialing',
  add column subscription_price_id text,
  add column subscription_current_period_end timestamptz;

create index profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);

-- Defense in depth: even though the client never sends these columns today,
-- explicitly block a signed-in user from ever updating their own billing
-- fields (e.g. self-granting an active subscription) via the public API.
-- Only nome/telefone remain client-writable, matching TrialSignupPage's
-- profile upsert.
revoke update on public.profiles from authenticated;
grant update (nome, telefone) on public.profiles to authenticated;
