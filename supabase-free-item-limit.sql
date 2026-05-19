-- Limit: same account can claim at most one $0 checkout per calendar day in a chosen IANA TZ.
-- Run in Supabase SQL Editor after deploying API that calls this RPC.
begin;

create or replace function public.count_free_checkouts_on_local_calendar_date(
  p_tz text default 'America/New_York'
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
    and square_payment_id is null
    and (o.created_at at time zone p_tz)::date = (now() at time zone p_tz)::date;
$$;

revoke all on function public.count_free_checkouts_on_local_calendar_date(text) from public;
grant execute on function public.count_free_checkouts_on_local_calendar_date(text) to authenticated;

commit;
