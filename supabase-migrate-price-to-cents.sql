-- Slept On Vintage - migrate products.price to cents (bigint) without renaming the column
-- Run in Supabase Dashboard → SQL Editor
--
-- Assumptions:
-- - Current `public.products.price` is numeric dollars (ex: 28.00)
-- - You want `public.products.price` to become bigint cents (ex: 2800)
--
-- This script converts values and preserves the column name `price`.

begin;

alter table public.products
  add column if not exists price_new bigint;

-- Convert dollars -> cents, rounding to nearest cent.
update public.products
set price_new = round(price * 100)::bigint
where price_new is null;

alter table public.products
  alter column price_new set not null;

-- Swap columns
alter table public.products
  drop column price;

alter table public.products
  rename column price_new to price;

alter table public.products
  add constraint products_price_nonnegative check (price >= 0);

commit;

