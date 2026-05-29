-- eBay bulk import (24 listings) — run in Supabase SQL Editor
-- Prices are cents. image NULL until you upload to Storage: images/products/{id}/
-- Then Admin → Set primary images

INSERT INTO public.products (name, size, image, category, price, available)
VALUES
  ('Vintage 1988 Harley Davidson T Shirt Black USA Legend 1930 Model 74 Sz Large 80s', 'L', NULL, 'shirts', 3999, true),
  ('Vintage 80s Corey Hart Fields of Fire World Tour 1987 Band T Shirt Mens Size XL', 'XL', NULL, 'shirts', 2499, true),
  ('Vintage Dallas Cowboys 1994 Magic Johnson T Size Small NFL USA Breakthrough', 'S', NULL, 'shirts', 4999, true),
  ('Vintage Y2K Surf Billabong HIC Hawaiian Island Creations Shirt Mens Medium Eagle', 'M', NULL, 'shirts', 1499, true),
  ('Vintage Y2K The Beatings Will Continue Skull Grunge Distressed Black T Shirt', 'L', NULL, 'shirts', 999, true),
  ('Vintage 90s Java Coding Microsoft Tech Tee Black T Shirt Size XL Single Stitch', 'XL', NULL, 'shirts', 2999, true),
  ('Vintage 1993 Houston Oilers AFC Central Champions T Shirt Large Single Stitch', 'L', NULL, 'shirts', 2999, true),
  ('Vintage Calvin Klein Spellout T Shirt Mens XL Black CK Logo 90s Rare', 'XL', NULL, 'shirts', 1499, true),
  ('Vintage Borders Books T Shirt Mens XL Music Bookstore Coffee Art Single Stitch', 'XL', NULL, 'shirts', 1499, true),
  ('Vintage Y2K No Boundaries Long Sleeve Shirt Mens Medium Navy Wasp Caution', 'M', NULL, 'shirts', 1499, true),
  ('Vintage San Diego Zoo Tiger Panther Leopard Big Cats Nature T Shirt Size XL', 'XL', NULL, 'shirts', 1499, true),
  ('Vintage Y2K Aeropostale Aero Hoodie Women''s XL Orange Thermal Embroidered Grunge', 'XL', NULL, 'hoodies', 1999, true),
  ('Vintage Y2K Black Hollister Embroidered Spellout California Hoodie Men''s Medium', 'M', NULL, 'hoodies', 1499, true),
  ('Vintage Y2K Hollister Full Zip Sweatshirt Gray Women''s Large California 1922', 'L', NULL, 'hoodies', 1499, true),
  ('McLaren Formula 1 Team Hollister Mens XL Grey Pullover Hoodie', 'XL', NULL, 'hoodies', 1499, true),
  ('Vintage Y2K Billabong Hoodie Women''s Medium Brown Zip Emo Surfing Grunge Mall', 'M', NULL, 'hoodies', 2999, true),
  ('Vintage 90s Mickey Mouse Tennis Sweatshirt USA XL Mens White Disney Crewneck', 'XL', NULL, 'sweaters', 1999, true),
  ('Vintage Y2K Old Navy Fleece Quarter Zip Sweater Men''s Size Medium Black Spellout', 'M', NULL, 'sweaters', 1499, true),
  ('Vintage Russell Athletic Sweatshirt Mens XL Black Crew Neck Made In USA Blank', 'XL', NULL, 'sweaters', 1499, true),
  ('Vintage Russell Athletic Sweatshirt Mens XL Green Crew Neck Made In USA Blank', 'XL', NULL, 'sweaters', 1499, true),
  ('Vintage GAP Men''s Black Medium Full Zip Y2K Hoodie Embroidered Sweatshirt', 'M', NULL, 'hoodies', 1499, true),
  ('Y2K Hollister Sweatshirt Women''s Medium Gray Logo Crewneck Pullover Spellout', 'M', NULL, 'sweaters', 999, true),
  ('Vintage Princeton Hanes Print Pro Heavyweight Crewneck Sweatshirt Size Medium', 'M', NULL, 'sweaters', 2499, true),
  ('Vintage Champion Reverse Weave Sweatshirt Adult Medium Luther College Minnesota', 'M', NULL, 'sweaters', 2999, true);
