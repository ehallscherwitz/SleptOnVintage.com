-- Slept On Vintage - sample seed data
-- Run in Supabase Dashboard → SQL Editor
-- Requires tables from `supabase-manual-schema.sql` to exist.

begin;

-- Optional: clear existing sample products (keeps your real data if you remove this block)
-- delete from public.products;

insert into public.products (name, price, size, image, category, available)
values
  (
    'Vintage Graphic Tee',
    28.00,
    'M',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    'shirts',
    true
  ),
  (
    'Striped Pocket Tee',
    24.00,
    'L',
    'https://images.unsplash.com/photo-1520975958225-8f8f5b0d8f2c?auto=format&fit=crop&w=1200&q=80',
    'shirts',
    true
  ),
  (
    'Vintage Crewneck Sweater',
    48.00,
    'M',
    'https://images.unsplash.com/photo-1520975759194-7a19f0b8b1b5?auto=format&fit=crop&w=1200&q=80',
    'sweaters',
    true
  ),
  (
    'Wool Knit Sweater',
    54.00,
    'L',
    'https://images.unsplash.com/photo-1520975693411-8c4a2f2b5756?auto=format&fit=crop&w=1200&q=80',
    'sweaters',
    true
  ),
  (
    'Classic Zip Hoodie',
    60.00,
    'L',
    'https://images.unsplash.com/photo-1520975911848-7b4db9f9601e?auto=format&fit=crop&w=1200&q=80',
    'hoodies',
    true
  ),
  (
    'Vintage Pullover Hoodie',
    58.00,
    'M',
    'https://images.unsplash.com/photo-1520975869751-7d8a7311ca4d?auto=format&fit=crop&w=1200&q=80',
    'hoodies',
    true
  ),
  (
    'Denim Jacket',
    85.00,
    'L',
    'https://images.unsplash.com/photo-1520975805304-5b79bb7f9f7c?auto=format&fit=crop&w=1200&q=80',
    'jackets',
    true
  ),
  (
    'Vintage Bomber Jacket',
    95.00,
    'M',
    'https://images.unsplash.com/photo-1520975790375-3d2d4c5b6c6c?auto=format&fit=crop&w=1200&q=80',
    'jackets',
    true
  ),
  (
    'Straight-Leg Denim',
    62.00,
    '32',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80',
    'pants',
    true
  ),
  (
    'Workwear Cargo Pants',
    68.00,
    '34',
    'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=1200&q=80',
    'pants',
    true
  ),
  (
    'Vintage Chino Shorts',
    35.00,
    '32',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    'shorts',
    true
  ),
  (
    'Classic Denim Shorts',
    39.00,
    '34',
    'https://images.unsplash.com/photo-1520975869751-7d8a7311ca4d?auto=format&fit=crop&w=1200&q=80',
    'shorts',
    true
  );

commit;

