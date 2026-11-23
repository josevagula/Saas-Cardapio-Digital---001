-- Asaas billing (replaces the never-deployed Stripe flow). The monthly plan is
-- a credit-card subscription created through Asaas' hosted Checkout, so card
-- data never touches our code. Written only by the asaas-* Edge Functions
-- using the service role key (profiles UPDATE is already restricted to
-- nome/telefone for signed-in users, see 20260806120000).
--
-- subscription_status keeps the same vocabulary the frontend already reads:
--   incomplete -> never finished checkout
--   trialing   -> checkout done, first charge scheduled (7 free days)
--   active     -> last charge paid
--   past_due   -> a charge is overdue / card refused
--   canceled   -> subscription deleted; access lasts until
--                 subscription_current_period_end
alter table public.profiles
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists asaas_checkout_id text;

create index if not exists profiles_asaas_customer_id_idx on public.profiles (asaas_customer_id);
create index if not exists profiles_asaas_subscription_id_idx on public.profiles (asaas_subscription_id);
create index if not exists profiles_asaas_checkout_id_idx on public.profiles (asaas_checkout_id);

-- Every webhook Asaas sends, keyed by its event id. Asaas delivers "at least
-- once", so the primary key makes reprocessing a duplicate a no-op, and the
-- stored payload makes billing issues debuggable after the fact. RLS on with
-- no policies: only the service role (the webhook function) can touch it.
create table if not exists public.asaas_webhook_events (
  id text primary key,
  event text not null,
  payload jsonb not null,
  profile_id uuid references public.profiles (id) on delete set null,
  note text,
  received_at timestamptz not null default now()
);

alter table public.asaas_webhook_events enable row level security;
