-- Accounts that are never charged nor locked by the paywall (owner's choice,
-- 2026-11-23: every account that existed before Asaas billing went live).
-- Not writable by clients: authenticated only has UPDATE on nome/telefone.
alter table public.profiles
  add column if not exists billing_exempt boolean not null default false;

update public.profiles
  set billing_exempt = true
  where created_at < '2026-11-23 12:00:00+00';
