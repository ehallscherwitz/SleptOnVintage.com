-- Slept On Vintage - orders + order_items + finalize_order()
-- Run in Supabase Dashboard → SQL Editor

begin;

create extension if not exists "pgcrypto";

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,

  -- money is stored in cents (integers) but we keep column names simple
  subtotal bigint not null check (subtotal >= 0),
  discount bigint not null default 0 check (discount >= 0),
  tax bigint not null default 0 check (tax >= 0),
  shipping bigint not null default 0 check (shipping >= 0),
  total bigint not null check (total >= 0),

  status text not null default 'paid',

  buyer_email text,
  promo_code text,
  shipping_name text,
  shipping_address jsonb,

  square_order_id text,
  square_payment_id text,

  carrier text default 'usps',
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If table already existed before we added `discount`, keep it forward-compatible.
alter table public.orders
  add column if not exists discount bigint not null default 0 check (discount >= 0);
alter table public.orders
  add column if not exists promo_code text;

create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists orders_square_payment_id_idx on public.orders (square_payment_id);
create index if not exists orders_square_order_id_idx on public.orders (square_order_id);

-- Idempotency + data integrity: a Square payment/order should only map to one row.
create unique index if not exists orders_square_payment_id_uniq
  on public.orders (square_payment_id)
  where square_payment_id is not null;
create unique index if not exists orders_square_order_id_uniq
  on public.orders (square_order_id)
  where square_order_id is not null;

-- Order items (snapshot of product at purchase time)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete restrict,

  name text not null,
  size text not null,
  image text,
  category text,
  price bigint not null check (price >= 0),

  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- RLS
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Orders: owner-only read
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

-- Order items: owner-only read via parent order
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

-- Atomic finalize function: reads current user's cart, writes order + items,
-- marks products unavailable, clears cart_items.
create or replace function public.finalize_order(
  p_square_order_id text,
  p_square_payment_id text,
  p_customer_info jsonb,
  p_shipping_info jsonb,
  p_promo_code text default null,
  p_subtotal bigint default null,
  p_discount bigint default 0,
  p_tax bigint default null,
  p_shipping bigint default 0,
  p_total bigint default null,
  p_tax_rate numeric default 0.085
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cart_id uuid;
  v_item_count int;
  v_updated_count int;
  v_subtotal bigint;
  v_discount bigint := 0;
  v_tax bigint;
  v_shipping bigint := 0;
  v_total bigint;
  v_order_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Idempotency: if we've already finalized this payment, return the existing order.
  if p_square_payment_id is not null then
    select o.id into v_order_id
    from public.orders o
    where o.square_payment_id = p_square_payment_id
      and o.user_id = v_user_id
    limit 1;

    if v_order_id is not null then
      return v_order_id;
    end if;
  end if;

  select c.id into v_cart_id
  from public.carts c
  where c.user_id = v_user_id;

  if v_cart_id is null then
    raise exception 'Cart not found';
  end if;

  -- Lock products involved (prevents simultaneous buys)
  perform 1
  from public.products p
  join public.cart_items ci on ci.product_id = p.id
  where ci.cart_id = v_cart_id
  for update;

  select count(*)::int, coalesce(sum(p.price), 0)::bigint
    into v_item_count, v_subtotal
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  if v_item_count = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Prefer server-supplied totals (derived from Square) when present.
  -- Fallback to computing tax/total from the cart snapshot.
  v_discount := greatest(coalesce(p_discount, 0), 0);
  v_shipping := greatest(coalesce(p_shipping, 0), 0);

  if p_subtotal is not null and p_tax is not null and p_total is not null then
    v_subtotal := greatest(p_subtotal, 0);
    v_tax := greatest(p_tax, 0);
    v_total := greatest(p_total, 0);
  else
    v_tax := round(v_subtotal * p_tax_rate)::bigint;
    v_total := v_subtotal + v_tax + v_shipping - v_discount;
    if v_total < 0 then
      v_total := 0;
    end if;
  end if;

  -- Ensure all items are still available; flip them to unavailable
  with wanted as (
    select ci.product_id
    from public.cart_items ci
    where ci.cart_id = v_cart_id
  ),
  updated as (
    update public.products p
    set available = false
    from wanted w
    where p.id = w.product_id
      and p.available = true
    returning p.id
  )
  select count(*)::int into v_updated_count from updated;

  if v_updated_count <> v_item_count then
    raise exception 'One or more items are no longer available';
  end if;

  insert into public.orders (
    user_id,
    subtotal, discount, tax, shipping, total,
    status,
    buyer_email,
    promo_code,
    shipping_name,
    shipping_address,
    square_order_id,
    square_payment_id
  )
  values (
    v_user_id,
    v_subtotal, v_discount, v_tax, v_shipping, v_total,
    'paid',
    p_customer_info->>'email',
    nullif(btrim(p_promo_code), ''),
    trim(coalesce(p_customer_info->>'firstName','') || ' ' || coalesce(p_customer_info->>'lastName','')),
    p_shipping_info,
    p_square_order_id,
    p_square_payment_id
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, name, size, image, category, price)
  select
    v_order_id,
    p.id,
    p.name,
    p.size,
    p.image,
    p.category,
    p.price
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  delete from public.cart_items where cart_id = v_cart_id;

  return v_order_id;
end;
$$;

-- Allow authenticated users to call it (function enforces auth.uid())
revoke all on function public.finalize_order(text, text, jsonb, jsonb, text, bigint, bigint, bigint, bigint, bigint, numeric) from public;
grant execute on function public.finalize_order(text, text, jsonb, jsonb, text, bigint, bigint, bigint, bigint, bigint, numeric) to authenticated;

commit;

