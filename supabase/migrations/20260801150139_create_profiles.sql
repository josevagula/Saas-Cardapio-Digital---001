-- profiles: extends auth.users with app-specific fields (nome, telefone).
-- One row per user, created automatically by the trigger below whenever
-- someone signs up through Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  telefone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user can only see their own profile row.
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Each user can only insert their own profile row (needed for the
-- client-side upsert done right after signUp() on the trial signup form).
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Each user can only edit their own profile row.
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-creates a profiles row for every new auth.users row, pre-filled with
-- nome/telefone from the signUp({ options: { data: { nome, telefone } } })
-- metadata when present. Runs as SECURITY DEFINER so it works even when
-- e-mail confirmation is required and the client has no session yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, telefone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nome',
    new.raw_user_meta_data ->> 'telefone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
