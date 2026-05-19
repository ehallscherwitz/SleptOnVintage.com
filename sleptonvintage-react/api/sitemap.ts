import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://sleptonvintage.com';
const IMAGES_BUCKET = process.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || 'images';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function productImageAlt(name: string, size: string, category: string): string {
  return `Vintage ${name} — pre-owned thrift ${category} size ${size}`;
}

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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  let productRows: {
    id: number;
    name: string;
    size: string;
    category: string;
    available: boolean;
    image: string | null;
    updated_at: string | null;
  }[] = [];

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('products')
      .select('id, name, size, category, available, image, updated_at')
      .order('id', { ascending: true });
    productRows = (data ?? []) as typeof productRows;
  }

  const urls: string[] = [];

  for (const path of STATIC_PATHS) {
    urls.push(
      `<url><loc>${xmlEscape(`${SITE_URL}${path}`)}</loc><changefreq>weekly</changefreq><priority>${path === '/' ? '1.0' : '0.8'}</priority></url>`,
    );
  }

  for (const p of productRows) {
    const loc = `${SITE_URL}/product/${p.id}`;
    const lastmod = p.updated_at ? p.updated_at.slice(0, 10) : undefined;
    const alt = productImageAlt(p.name, p.size, p.category);

    let imageBlock = '';
    const imgPath = (p.image || '').trim();
    if (imgPath.startsWith('products/') && supabaseUrl) {
      const imageLoc = xmlEscape(
        `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${IMAGES_BUCKET}/${imgPath}`,
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
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
