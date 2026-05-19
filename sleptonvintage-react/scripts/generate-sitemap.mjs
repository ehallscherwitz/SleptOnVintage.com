/**
 * Writes public/sitemap.xml at build time (Vercel injects VITE_* into process.env).
 * Run: node scripts/generate-sitemap.mjs
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'sitemap.xml');

const SITE_URL = 'https://sleptonvintage.com';
const IMAGES_BUCKET =
  process.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
  process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
  'images';

const STATIC_PATHS = [
  '/',
  '/search',
  '/shirts',
  '/sweaters',
  '/hoodies',
  '/jackets',
  '/pants',
  '/shorts',
  '/privacy',
  '/terms',
  '/contact',
];

function xmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function productImageAlt(name, size, category) {
  const trimmed = String(name ?? '').trim();
  const hasVintage = /\bvintage\b/i.test(trimmed);
  const title = hasVintage ? trimmed : `Vintage ${trimmed}`;
  return `${title} — pre-owned thrift ${category} size ${size}`;
}

function supabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

async function main() {
  const env = supabaseEnv();
  let productRows = [];

  if (env) {
    const supabase = createClient(env.url, env.key);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, size, category, available, image, created_at')
      .order('id', { ascending: true });

    if (error) {
      console.error('Sitemap: Supabase query failed:', error.message);
      process.exit(1);
    }
    productRows = data ?? [];
    console.log(`Sitemap: ${productRows.length} products from Supabase`);
  } else {
    console.warn(
      'Sitemap: missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — static pages only.',
    );
  }

  const urls = [];

  for (const path of STATIC_PATHS) {
    urls.push(
      `<url><loc>${xmlEscape(`${SITE_URL}${path}`)}</loc><changefreq>weekly</changefreq><priority>${path === '/' ? '1.0' : '0.8'}</priority></url>`,
    );
  }

  for (const p of productRows) {
    const loc = `${SITE_URL}/product/${p.id}`;
    const lastmod = p.created_at ? String(p.created_at).slice(0, 10) : undefined;
    const alt = productImageAlt(p.name, p.size, p.category);

    let imageBlock = '';
    const imgPath = (p.image || '').trim();
    if ((imgPath.startsWith('products/') || imgPath.startsWith('items/')) && env) {
      const imageLoc = xmlEscape(
        `${env.url.replace(/\/$/, '')}/storage/v1/object/public/${IMAGES_BUCKET}/${imgPath}`,
      );
      imageBlock = `<image:image><image:loc>${imageLoc}</image:loc><image:title>${xmlEscape(alt)}</image:title></image:image>`;
    }

    urls.push(
      `<url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${p.available ? 'daily' : 'monthly'}</changefreq><priority>0.9</priority>${imageBlock}</url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;

  writeFileSync(OUT, xml, 'utf8');
  console.log(`Sitemap: wrote ${OUT} (${urls.length} URLs)`);
}

main().catch((err) => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});
