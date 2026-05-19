/**
 * Pinterest Catalogs API v5 — batch upsert/delete shopping items.
 * @see https://developers.pinterest.com/docs/api/v5/#operation/items_batch/post
 */

const API_BASE = 'https://api.pinterest.com/v5';
const SITE_URL = 'https://sleptonvintage.com';
const BRAND = 'Slept On Vintage';
const COUNTRY = 'US';
const LANGUAGE = 'en';
const BATCH_CHUNK = 50;

export type PinterestProductRow = {
  id: number;
  name: string;
  size: string;
  category: string;
  available: boolean;
  image: string | null;
  price: number;
};

function imagesBucket(): string {
  return (
    process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
    process.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
    'images'
  );
}

function supabasePublicUrl(): string | null {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    null
  );
}

export function isPinterestCatalogConfigured(): boolean {
  return Boolean(process.env.PINTEREST_ACCESS_TOKEN?.trim());
}

function feedTitle(name: string): string {
  const trimmed = String(name ?? '').trim();
  if (/\bvintage\b/i.test(trimmed)) return trimmed;
  return `Vintage ${trimmed}`;
}

function feedDescription(name: string, size: string, category: string): string {
  const cat = String(category ?? 'clothing').replace(/s$/, '');
  return (
    `Authentic vintage and thrift ${cat} — ${name}, size ${size}. ` +
    `One-of-one pre-owned piece from ${BRAND}. Free US shipping.`
  );
}

function formatPrice(cents: number): string {
  const n = Number(cents);
  if (!Number.isFinite(n) || n < 0) return '0.00 USD';
  return `${(n / 100).toFixed(2)} USD`;
}

export function productImageLink(imagePath: string | null | undefined): string | null {
  const path = (imagePath || '').trim();
  if (!path.startsWith('products/') && !path.startsWith('items/')) return null;
  const base = supabasePublicUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${imagesBucket()}/${path}`;
}

export function productToPinterestItem(product: PinterestProductRow): {
  item_id: string;
  attributes: Record<string, string>;
} | null {
  const imageLink = productImageLink(product.image);
  if (!imageLink) return null;

  const id = String(product.id);
  return {
    item_id: id,
    attributes: {
      id,
      title: feedTitle(product.name).slice(0, 500),
      description: feedDescription(product.name, product.size, product.category).slice(0, 10000),
      link: `${SITE_URL}/product/${product.id}`,
      image_link: imageLink,
      price: formatPrice(product.price),
      availability: product.available ? 'in stock' : 'out of stock',
      condition: 'used',
      brand: BRAND,
      google_product_category: 'Apparel & Accessories > Clothing',
      size: String(product.size).slice(0, 100),
    },
  };
}

type BatchResult = { ok: true; batchId?: string } | { ok: false; error: string; status?: number };

async function postItemsBatch(body: Record<string, unknown>): Promise<BatchResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN?.trim();
  if (!token) return { ok: false, error: 'PINTEREST_ACCESS_TOKEN not set' };

  const url = new URL(`${API_BASE}/catalogs/items/batch`);
  const adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID?.trim();
  if (adAccountId) url.searchParams.set('ad_account_id', adAccountId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: { batch_id?: string; message?: string } | null = null;
  try {
    json = text ? (JSON.parse(text) as { batch_id?: string; message?: string }) : null;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg = json?.message || text || res.statusText;
    return { ok: false, error: msg.slice(0, 500), status: res.status };
  }

  return { ok: true, batchId: json?.batch_id };
}

export async function upsertPinterestProductsStrict(
  products: PinterestProductRow[],
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const items = products
    .map(productToPinterestItem)
    .filter((x): x is NonNullable<typeof x> => x != null);
  const skipped = products.length - items.length;
  const errors: string[] = [];
  let synced = 0;

  for (let i = 0; i < items.length; i += BATCH_CHUNK) {
    const chunk = items.slice(i, i + BATCH_CHUNK);
    const result = await postItemsBatch({
      country: COUNTRY,
      language: LANGUAGE,
      operation: 'UPSERT',
      items: chunk,
    });
    if (!result.ok) {
      errors.push(result.error);
      console.error('Pinterest UPSERT batch failed:', result.error);
    } else {
      synced += chunk.length;
    }
  }

  return { synced, skipped, errors };
}

export async function deletePinterestProductIds(productIds: number[]): Promise<string[]> {
  const errors: string[] = [];
  const ids = productIds.map((id) => String(id));

  for (let i = 0; i < ids.length; i += BATCH_CHUNK) {
    const chunk = ids.slice(i, i + BATCH_CHUNK);
    const result = await postItemsBatch({
      country: COUNTRY,
      language: LANGUAGE,
      operation: 'DELETE',
      items: chunk.map((item_id) => ({ item_id })),
    });
    if (!result.ok) {
      errors.push(result.error);
      console.error('Pinterest DELETE batch failed:', result.error);
    }
  }

  return errors;
}
