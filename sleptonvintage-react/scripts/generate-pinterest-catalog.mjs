/**
 * Writes public/pinterest-catalog.csv for Pinterest Catalogs (hosted URL ingestion).
 * Run: node scripts/generate-pinterest-catalog.mjs
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'pinterest-catalog.csv');

const SITE_URL = 'https://sleptonvintage.com';
const BRAND = 'Slept On Vintage';
const IMAGES_BUCKET =
  process.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
  process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
  'images';

const HEADERS = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'price',
  'availability',
  'condition',
  'brand',
  'google_product_category',
];

function supabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function csvCell(value) {
  const s = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

function feedTitle(name) {
  const trimmed = String(name ?? '').trim();
  if (/\bvintage\b/i.test(trimmed)) return trimmed;
  return `Vintage ${trimmed}`;
}

function feedDescription(name, size, category) {
  const cat = String(category ?? 'clothing').replace(/s$/, '');
  return (
    `Authentic vintage and thrift ${cat} — ${name}, size ${size}. ` +
    `One-of-one pre-owned piece from ${BRAND}. Free US shipping.`
  );
}

function storageImageUrl(env, imagePath) {
  const path = (imagePath || '').trim();
  if (!path.startsWith('products/') && !path.startsWith('items/')) return null;
  return `${env.url.replace(/\/$/, '')}/storage/v1/object/public/${IMAGES_BUCKET}/${path}`;
}

/** Pinterest: ISO 4217 e.g. 19.99USD (Error 113 rejects bad/missing prices). */
function formatPrice(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${(n / 100).toFixed(2)}USD`;
}

/** Google product taxonomy paths (invalid nodes are not published by Pinterest). */
const GOOGLE_PRODUCT_CATEGORY = {
  shirts: 'Apparel & Accessories > Clothing > Shirts & Tops',
  sweaters: 'Apparel & Accessories > Clothing > Shirts & Tops',
  hoodies: 'Apparel & Accessories > Clothing > Shirts & Tops',
  jackets: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
  pants: 'Apparel & Accessories > Clothing > Pants',
  shorts: 'Apparel & Accessories > Clothing > Shorts',
};

function googleProductCategory(category) {
  return GOOGLE_PRODUCT_CATEGORY[category] ?? 'Apparel & Accessories > Clothing > Shirts & Tops';
}

async function main() {
  const env = supabaseEnv();
  if (!env) {
    console.error('Pinterest catalog: missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(env.url, env.key);
  const { data, error } = await supabase
    .from('products')
    .select('id, name, size, category, image, price')
    .eq('available', true)
    .order('id', { ascending: true });

  if (error) {
    console.error('Pinterest catalog: Supabase query failed:', error.message);
    process.exit(1);
  }

  const rows = [];
  let skippedNoImage = 0;
  let skippedBadPrice = 0;

  for (const p of data ?? []) {
    const imageLink = storageImageUrl(env, p.image);
    if (!imageLink) {
      skippedNoImage += 1;
      continue;
    }

    const price = formatPrice(p.price);
    if (!price) {
      skippedBadPrice += 1;
      console.warn(`Pinterest catalog: skip id ${p.id} — invalid price (${p.price})`);
      continue;
    }

    const link = `${SITE_URL}/product/${p.id}`;
    rows.push(
      csvRow([
        String(p.id),
        feedTitle(p.name),
        feedDescription(p.name, p.size, p.category),
        link,
        imageLink,
        price,
        'in stock',
        'used',
        BRAND,
        googleProductCategory(p.category),
      ]),
    );
  }

  const csv = `${HEADERS.join(',')}\n${rows.join('\n')}\n`;
  writeFileSync(OUT, csv, 'utf8');
  console.log(
    `Pinterest catalog: wrote ${OUT} (${rows.length} products, ${skippedNoImage} skipped without image, ${skippedBadPrice} skipped bad price)`,
  );
  console.log(`Feed URL: ${SITE_URL}/pinterest-catalog.csv`);
}

main().catch((err) => {
  console.error('Pinterest catalog generation failed:', err);
  process.exit(1);
});
