-- Card attempts made through the on-site payment form (asaas-subscribe-card),
-- used to rate-limit card testing. Never holds card data. Only the service
-- role (Edge Functions) touches it: RLS on, no policies.
create table if not exists public.billing_card_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ok boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists billing_card_attempts_user_time
  on public.billing_card_attempts (user_id, created_at desc);

alter table public.billing_card_attempts enable row level security;
