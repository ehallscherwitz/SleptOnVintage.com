-- Limit: same account can claim at most one $0 checkout per rolling window (default 14 days).
-- Run in Supabase SQL Editor after deploying API that calls this RPC.
begin;

drop function if exists public.count_free_checkouts_on_local_calendar_date(text);

create or replace function public.count_free_checkouts_in_last_days(
  p_days integer default 14
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.orders o
  where o.user_id = auth.uid()
    and o.total = 0
    and o.square_payment_id is null
    and o.created_at >= now() - make_interval(days => greatest(p_days, 1));
$$;

revoke all on function public.count_free_checkouts_in_last_days(integer) from public;
grant execute on function public.count_free_checkouts_in_last_days(integer) to authenticated;

commit;
