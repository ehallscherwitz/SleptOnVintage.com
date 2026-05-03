-- Product image gallery via Supabase Storage
-- Bucket layout: bucket `images`, objects under prefix `products/{product_id}/{filename}`
-- Example: images/products/1/01.webp, images/products/1/02.webp
--
-- Gallery order is by filename (lexical). For predictable order after bulk upload, name files 01.webp, 02.webp, …
--
-- Run in Supabase Dashboard → SQL Editor after creating the bucket (below).

begin;

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update
set public = excluded.public;

-- Policies on storage.objects
drop policy if exists "Public read images bucket" on storage.objects;
create policy "Public read images bucket"
on storage.objects
for select
using (bucket_id = 'images');

-- Authenticated uploads (optional): allow signed-in users to upload into items/* only when you’re ready for in-app uploads.
-- For now, uploads are typically via Dashboard / service role — leave insert policies off unless needed.

commit;
