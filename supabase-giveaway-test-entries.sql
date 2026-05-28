-- Fake / test giveaway entrants (admin-seeded via service role)
-- Run in Supabase Dashboard → SQL Editor after supabase-giveaways.sql

begin;

alter table public.giveaway_entries
  add column if not exists is_test boolean not null default false;

-- Test entries have no auth user; real entries always do.
alter table public.giveaway_entries
  alter column user_id drop not null;

alter table public.giveaway_entries
  drop constraint if exists giveaway_entries_giveaway_id_user_id_key;

drop index if exists public.giveaway_entries_giveaway_id_user_id_key;

create unique index if not exists giveaway_entries_giveaway_user_uniq
  on public.giveaway_entries (giveaway_id, user_id)
  where user_id is not null;

create unique index if not exists giveaway_entries_giveaway_test_email_uniq
  on public.giveaway_entries (giveaway_id, email)
  where is_test = true;

alter table public.giveaway_entries
  drop constraint if exists giveaway_entries_user_check;

alter table public.giveaway_entries
  add constraint giveaway_entries_user_check
  check (
    (is_test = true and user_id is null)
    or (is_test = false and user_id is not null)
  );

-- Real users cannot insert test rows from the client.
drop policy if exists "giveaway_entries_insert_own_active" on public.giveaway_entries;
create policy "giveaway_entries_insert_own_active"
on public.giveaway_entries
for insert
to authenticated
with check (
  is_test = false
  and auth.uid() = user_id
  and exists (
    select 1
    from public.giveaways g
    where g.id = giveaway_entries.giveaway_id
      and g.resolved_at is null
      and now() >= g.starts_at
      and now() < g.ends_at
  )
);

-- Resolve: test winners get no order (nothing to ship); product still marked sold for realistic UX.
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

  if coalesce(v_e.is_test, false) then
    update public.giveaways
    set resolved_at = now(),
        updated_at = now(),
        winner_entry_id = v_e.id,
        winner_user_id = null,
        winner_name = v_e.full_name,
        winner_email = v_e.email,
        winner_order_id = null
    where id = v_g.id;

    return jsonb_build_object(
      'ok', true,
      'resolved', true,
      'winner_name', v_e.full_name,
      'winner_email', v_e.email,
      'winner_order_id', null,
      'is_test_winner', true
    );
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

grant execute on function public.resolve_giveaway(uuid) to anon, authenticated;

commit;
