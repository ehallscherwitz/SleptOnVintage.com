-- Fix: resolved giveaways vanished from /giveaway immediately after pick.
-- active_giveaway_public incorrectly required resolved_at IS NULL, so the 24h replay never appeared.
-- Run in Supabase Dashboard → SQL Editor.

begin;

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
  now() >= g.starts_at
  and now() <= g.ends_at + interval '24 hours';

commit;
