-- Slept On Vintage (manual schema)
-- Run in Supabase Dashboard → SQL Editor.

begin;

-- Extensions (safe if already installed)
create extension if not exists "pgcrypto";

-- Products (public catalog)
create table if not exists public.products (
  id bigserial primary key,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  size text not null,
  image text,
  category text not null,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- User carts (1 cart per user)
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- Cart items (unique vintage items → quantity implied as 1)
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- Helpful indexes
create index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);
create index if not exists products_category_idx on public.products (category);

-- RLS
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

-- Products: readable by anyone (catalog)
drop policy if exists "products_select_all" on public.products;
create policy "products_select_all"
on public.products
for select
to anon, authenticated
using (true);

-- Carts: owner-only
drop policy if exists "carts_select_own" on public.carts;
create policy "carts_select_own"
on public.carts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "carts_insert_own" on public.carts;
create policy "carts_insert_own"
on public.carts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "carts_update_own" on public.carts;
create policy "carts_update_own"
on public.carts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "carts_delete_own" on public.carts;
create policy "carts_delete_own"
on public.carts
for delete
to authenticated
using (auth.uid() = user_id);

-- Cart items: owner-only via the cart
drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own"
on public.cart_items
for select
to authenticated
using (
  exists (
    select 1
    from public.carts c
    where c.id = cart_items.cart_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own"
on public.cart_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.carts c
    where c.id = cart_items.cart_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own"
on public.cart_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.carts c
    where c.id = cart_items.cart_id
      and c.user_id = auth.uid()
  )
);

commit;

