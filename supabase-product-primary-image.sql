-- Primary product image (for listing pages) via Supabase Storage
-- Detail pages load the full gallery from Storage (products/{id}/...).
--
-- We keep using the existing `public.products.image` column as the primary image pointer.
-- Store a PATH (not a full URL), e.g. `products/123/01.webp`
--
-- After you backfill and update the app, you can optionally drop the legacy `products.image` column.

begin;

-- No schema change required if you already have `products.image`.

-- Optional helper: if your `products.image` currently stores a FULL URL but you want to convert it to Storage paths,
-- you’ll do that manually (depends on your old bucket/URL format).

commit;

-- Optional (run later when you're ready):
-- If you ever add a separate column, do it then. For now, `image` is the primary image.
