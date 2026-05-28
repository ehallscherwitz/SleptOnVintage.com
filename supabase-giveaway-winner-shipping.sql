-- Run in Supabase SQL Editor if you already applied supabase-giveaways.sql
-- Lets giveaway winners submit shipping on their $0 giveaway order.

begin;

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
