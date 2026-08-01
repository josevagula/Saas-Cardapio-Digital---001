-- Business data (menu, orders, coupons, customers, branding, analytics) for
-- each Ponto Japa account. Previously lived only in browser localStorage;
-- these tables make it real, persistent, and properly scoped per account.

create table public.categories (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '',
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text,
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  promo_price numeric,
  image_url text not null default '',
  is_available boolean not null default true,
  ingredients text[] not null default '{}',
  sales_count integer not null default 0,
  tags text[],
  sales_success_rate text,
  is_combo_builder boolean,
  total_pieces integer,
  supports_half_and_half boolean,
  half_and_half_flavors text[],
  created_at timestamptz not null default now()
);

create table public.orders (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_address text,
  items jsonb not null default '[]',
  status text not null default 'received',
  payment_method text not null,
  delivery_method text not null,
  delivery_fee numeric not null default 0,
  discount_amount numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  points_earned integer not null default 0,
  coupon_code text,
  notes text,
  needs_change boolean,
  change_amount text,
  hashi_count integer,
  kit_auto_included jsonb,
  is_upsell_order boolean
);

create table public.coupons (
  code text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  discount_type text not null,
  value numeric not null default 0,
  min_order_value numeric not null default 0,
  is_first_purchase_only boolean,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, code)
);

create table public.customers (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  address text,
  loyalty_points integer not null default 0,
  order_count integer not null default 0,
  last_order_date date,
  vip_tier text,
  favorite_combo text,
  is_sushi_lovers_sub boolean,
  created_at timestamptz not null default now()
);

create table public.visual_configs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  logo_url text not null default '',
  banner_url text not null default '',
  primary_color text not null default '#F97316',
  font_family text not null default 'display',
  theme_mode text not null default 'dark',
  establishment_name text not null default '',
  phone text not null default '',
  address text not null default '',
  delivery_fee numeric not null default 0,
  menu_slug text,
  opening_time text,
  closing_time text,
  opening_days text,
  operating_days_list text[],
  delivery_time text,
  auto_status_by_time boolean,
  is_store_open_manual boolean,
  auto_kit_config jsonb,
  updated_at timestamptz not null default now()
);

create table public.analytics_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.coupons enable row level security;
alter table public.customers enable row level security;
alter table public.visual_configs enable row level security;
alter table public.analytics_snapshots enable row level security;

create policy "categories_owner_all" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "products_owner_all" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "orders_owner_all" on public.orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "coupons_owner_all" on public.coupons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "customers_owner_all" on public.customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "visual_configs_owner_all" on public.visual_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "analytics_snapshots_owner_all" on public.analytics_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index products_user_id_idx on public.products (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index orders_user_id_idx on public.orders (user_id, created_at desc);
create index customers_user_id_idx on public.customers (user_id);
