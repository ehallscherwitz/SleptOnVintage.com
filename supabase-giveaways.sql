-- Slept On Vintage - giveaways (wheel of names)
-- Run in Supabase Dashboard → SQL Editor

begin;

create extension if not exists "pgcrypto";

-- Keep compatible with older installs that don't yet have these columns.
alter table public.products
  add column if not exists updated_at timestamptz not null default now();

alter table public.products
  add column if not exists storage_prefix text;

-- A giveaway is associated to exactly one product listing.
create table if not exists public.giveaways (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products (id) on delete restrict,

  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  resolved_at timestamptz,
  winner_entry_id uuid,
  winner_user_id uuid references auth.users (id) on delete set null,
  winner_name text,
  winner_email text,
  winner_order_id uuid references public.orders (id) on delete set null
);

create index if not exists giveaways_product_id_idx on public.giveaways (product_id);
create index if not exists giveaways_ends_at_idx on public.giveaways (ends_at desc);
create index if not exists giveaways_resolved_at_idx on public.giveaways (resolved_at);

-- A product can only be in one unresolved giveaway at a time.
create unique index if not exists giveaways_product_id_unresolved_uniq
  on public.giveaways (product_id)
  where resolved_at is null;

-- Giveaway entries: one per user per giveaway.
create table if not exists public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (giveaway_id, user_id)
);

create index if not exists giveaway_entries_giveaway_id_idx on public.giveaway_entries (giveaway_id, created_at asc);
create index if not exists giveaway_entries_user_id_idx on public.giveaway_entries (user_id);

-- RLS
alter table public.giveaways enable row level security;
alter table public.giveaway_entries enable row level security;

-- Giveaways: readable by anyone (so the countdown + wheel can be public).
drop policy if exists "giveaways_select_public" on public.giveaways;
create policy "giveaways_select_public"
on public.giveaways
for select
to anon, authenticated
using (
  -- Expose active giveaways and keep a 24h replay window after resolution
  now() <= ends_at + interval '24 hours'
);

-- Entries: readable by anyone only while the giveaway is active or within 24h after it ends.
drop policy if exists "giveaway_entries_select_public_window" on public.giveaway_entries;
create policy "giveaway_entries_select_public_window"
on public.giveaway_entries
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.giveaways g
    where g.id = giveaway_entries.giveaway_id
      and now() <= g.ends_at + interval '24 hours'
  )
);

-- Entries: authenticated users can enter once, only while the giveaway is active.
drop policy if exists "giveaway_entries_insert_own_active" on public.giveaway_entries;
create policy "giveaway_entries_insert_own_active"
on public.giveaway_entries
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.giveaways g
    where g.id = giveaway_entries.giveaway_id
      and g.resolved_at is null
      and now() >= g.starts_at
      and now() < g.ends_at
  )
);

-- View for storefront listing queries: hide products currently in an active giveaway.
drop view if exists public.products_public;
create view public.products_public
with (security_invoker = true)
as
select p.*
from public.products p
left join public.giveaways g
  on g.product_id = p.id
  and g.resolved_at is null
  and now() >= g.starts_at
  and now() < g.ends_at
where g.id is null;

-- View for storefront giveaway page + homepage countdown.
drop view if exists public.active_giveaway_public;
create view public.active_giveaway_public
with (security_invoker = true)
as
select
  g.id,
  g.product_id,
  g.starts_at,
  g.ends_at,
  g.resolved_at,
  g.winner_name,
  g.winner_email,
  g.winner_order_id,
  p.name as product_name,
  p.size as product_size,
  p.price as product_price,
  p.image as product_image,
  p.category as product_category,
  p.available as product_available,
  p.updated_at as product_updated_at,
  p.storage_prefix as product_storage_prefix
from public.giveaways g
join public.products p on p.id = g.product_id
where
  g.resolved_at is null
  and now() >= g.starts_at
  and now() <= g.ends_at + interval '24 hours';

-- Resolve a giveaway exactly once after it ends.
-- Any visitor may trigger this; the function is safe to call repeatedly.
create or replace function public.resolve_giveaway(p_giveaway_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_g public.giveaways%rowtype;
  v_e public.giveaway_entries%rowtype;
  v_p public.products%rowtype;
  v_order_id uuid;
begin
  select * into v_g
  from public.giveaways g
  where g.id = p_giveaway_id
  for update;

  if v_g.id is null then
    raise exception 'Giveaway not found';
  end if;

  if v_g.resolved_at is not null then
    return jsonb_build_object(
      'ok', true,
      'resolved', true,
      'winner_name', v_g.winner_name,
      'winner_email', v_g.winner_email,
      'winner_order_id', v_g.winner_order_id
    );
  end if;

  if now() < v_g.ends_at then
    return jsonb_build_object('ok', true, 'resolved', false);
  end if;

  select * into v_p
  from public.products p
  where p.id = v_g.product_id
  for update;

  if v_p.id is null then
    raise exception 'Product not found';
  end if;

  -- Pick a random entrant (or resolve with no winner if nobody entered).
  select * into v_e
  from public.giveaway_entries e
  where e.giveaway_id = v_g.id
  order by random()
  limit 1;

  if v_e.id is null then
    update public.giveaways
    set resolved_at = now(),
        updated_at = now()
    where id = v_g.id;

    return jsonb_build_object('ok', true, 'resolved', true, 'winner_name', null, 'winner_email', null, 'winner_order_id', null);
  end if;

  if v_p.available is distinct from true then
    raise exception 'Product is not available';
  end if;

  update public.products
  set available = false
  where id = v_p.id
    and available = true;

  if not found then
    raise exception 'Product was already claimed';
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
    square_payment_id,
    created_at,
    updated_at
  ) values (
    v_e.user_id,
    0, 0, 0, 0, 0,
    'giveaway',
    v_e.email,
    null,
    null,
    null,
    null,
    null,
    now(),
    now()
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    name,
    size,
    image,
    category,
    price,
    created_at
  ) values (
    v_order_id,
    v_p.id,
    v_p.name,
    v_p.size,
    v_p.image,
    v_p.category,
    0,
    now()
  );

  update public.giveaways
  set resolved_at = now(),
      updated_at = now(),
      winner_entry_id = v_e.id,
      winner_user_id = v_e.user_id,
      winner_name = v_e.full_name,
      winner_email = v_e.email,
      winner_order_id = v_order_id
  where id = v_g.id;

  return jsonb_build_object(
    'ok', true,
    'resolved', true,
    'winner_name', v_e.full_name,
    'winner_email', v_e.email,
    'winner_order_id', v_order_id
  );
end;
$$;

-- Allow the storefront (anon/authenticated) to trigger resolution.
grant execute on function public.resolve_giveaway(uuid) to anon, authenticated;

-- Giveaway winners submit shipping on their $0 order (status moves giveaway → paid).
create or replace function public.submit_giveaway_winner_shipping(
  p_order_id uuid,
  p_customer_info jsonb,
  p_shipping_info jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order public.orders%rowtype;
  v_first text;
  v_last text;
  v_email text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_order
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.status is distinct from 'giveaway' then
    raise exception 'Not a giveaway order';
  end if;

  if v_order.shipping_address is not null then
    raise exception 'Shipping already submitted';
  end if;

  v_first := trim(coalesce(p_customer_info->>'firstName', ''));
  v_last := trim(coalesce(p_customer_info->>'lastName', ''));
  v_email := trim(coalesce(p_customer_info->>'email', ''));

  if v_first = '' or v_last = '' or v_email = '' then
    raise exception 'First name, last name, and email are required';
  end if;

  if trim(coalesce(p_shipping_info->>'address1', '')) = ''
     or trim(coalesce(p_shipping_info->>'city', '')) = ''
     or trim(coalesce(p_shipping_info->>'state', '')) = ''
     or trim(coalesce(p_shipping_info->>'zipCode', '')) = '' then
    raise exception 'Complete shipping address is required';
  end if;

  update public.orders
  set
    buyer_email = v_email,
    shipping_name = v_first || ' ' || v_last,
    shipping_address = p_shipping_info,
    status = 'paid',
    updated_at = now()
  where id = p_order_id;
end;
$$;

grant execute on function public.submit_giveaway_winner_shipping(uuid, jsonb, jsonb) to authenticated;

commit;

