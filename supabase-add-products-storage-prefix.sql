-- Optional: custom Storage folder segment per product (default remains numeric `id`).
-- Run in Supabase → SQL Editor if you want `storage_prefix` on `public.products`.
-- The app works without this column (paths use `products/<id>/`).

begin;

alter table public.products
  add column if not exists storage_prefix text;

-- Optional: prevent duplicate folder slugs when set (ignores nulls)
create unique index if not exists products_storage_prefix_unique
  on public.products (storage_prefix)
  where storage_prefix is not null and length(trim(storage_prefix)) > 0;

commit;
