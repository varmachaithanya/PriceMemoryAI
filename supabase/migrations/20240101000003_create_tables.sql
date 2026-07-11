-- Profiles table (linked to auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  mobile text,
  role user_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add constraint mobile_format_check 
  check (mobile is null or mobile ~ '^\+?[0-9]{10,15}$');

-- Stores table
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canonical_name text not null,
  category text,
  brand text,
  unit_type unit_type not null default 'piece',
  created_at timestamptz not null default now()
);

-- Purchases table
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  unit unit_type not null,
  total_price numeric not null check (total_price > 0),
  unit_price numeric not null check (unit_price > 0),
  purchase_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- Receipts table
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  receipt_date date,
  processing_status receipt_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Alerts table
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  message text not null,
  alert_type alert_type not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

-- Item aliases cache table
create table public.item_aliases (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null unique,
  normalized_name text not null,
  language text,
  resolved_by text check (resolved_by in ('fuzzy_match', 'ai')),
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index idx_stores_user_id on public.stores(user_id);
create index idx_products_user_id on public.products(user_id);
create index idx_products_canonical_name on public.products(canonical_name);
create index idx_purchases_user_id on public.purchases(user_id);
create index idx_purchases_store_id on public.purchases(store_id);
create index idx_purchases_product_id on public.purchases(product_id);
create index idx_purchases_purchase_date on public.purchases(purchase_date);
create index idx_receipts_user_id on public.receipts(user_id);
create index idx_alerts_user_id on public.alerts(user_id);
create index idx_alerts_read on public.alerts(user_id, read);
create index idx_item_aliases_raw_text on public.item_aliases(raw_text);
