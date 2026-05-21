/**
 * Pinterest Catalogs API v5 — batch upsert/delete shopping items.
 * @see https://developers.pinterest.com/docs/api/v5/#operation/items_batch/post
 */

export function pinterestApiBase(): string {
  const explicit = process.env.PINTEREST_API_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const useSandbox = (process.env.PINTEREST_USE_SANDBOX || '').trim().toLowerCase();
  if (useSandbox === 'true' || useSandbox === '1' || useSandbox === 'yes') {
    return 'https://api-sandbox.pinterest.com/v5';
  }
  return 'https://api.pinterest.com/v5';
}
const SITE_URL = 'https://sleptonvintage.com';
const BRAND = 'Slept On Vintage';
const COUNTRY = 'US';
/** Pinterest CatalogsLocale — must match feed profile (e.g. English US). */
const LANGUAGE = 'en-US';
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

/** Non-secret summary for admin sync errors (token prefix only). */
export function getPinterestSyncDiagnostics(): {
  apiBase: string;
  sandboxEnv: string;
  tokenKind: string;
  hasAdAccountId: boolean;
} {
  const token = process.env.PINTEREST_ACCESS_TOKEN?.trim() || '';
  const sandboxEnv = (process.env.PINTEREST_USE_SANDBOX || '').trim() || '(unset)';
  const useSandbox = ['true', '1', 'yes'].includes(sandboxEnv.toLowerCase());
  let tokenKind = 'dashboard / other (no pina/pinc prefix)';
  if (token.startsWith('pina')) tokenKind = 'OAuth authorization_code (pina)';
  else if (token.startsWith('pinc')) tokenKind = 'OAuth client_credentials (pinc)';

  const hostIsSandbox = pinterestApiBase().includes('api-sandbox');
  if (useSandbox && !hostIsSandbox) {
    tokenKind += ' — WARNING: sandbox env flag but production API host';
  }
  if (!useSandbox && hostIsSandbox) {
    tokenKind += ' — WARNING: sandbox API host but sandbox flag off';
  }

  return {
    apiBase: pinterestApiBase(),
    sandboxEnv,
    tokenKind,
    hasAdAccountId: Boolean(process.env.PINTEREST_AD_ACCOUNT_ID?.trim()),
  };
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

/** Pinterest feed: ISO 4217 style e.g. 19.99USD (see catalog Error 113). */
function formatPrice(cents: number): string | null {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${(n / 100).toFixed(2)}USD`;
}

const GOOGLE_PRODUCT_CATEGORY: Record<string, string> = {
  shirts: 'Apparel & Accessories > Clothing > Shirts',
  sweaters: 'Apparel & Accessories > Clothing > Sweaters',
  hoodies: 'Apparel & Accessories > Clothing > Hoodies',
  jackets: 'Apparel & Accessories > Clothing > Coats & Jackets',
  pants: 'Apparel & Accessories > Clothing > Pants',
  shorts: 'Apparel & Accessories > Clothing > Shorts',
};

function googleProductCategory(category: string): string {
  return GOOGLE_PRODUCT_CATEGORY[category] ?? 'Apparel & Accessories > Clothing';
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
  if (!product.available) return null;

  const imageLink = productImageLink(product.image);
  if (!imageLink) return null;

  const price = formatPrice(product.price);
  if (!price) return null;

  const id = String(product.id);
  return {
    item_id: id,
    attributes: {
      id,
      title: feedTitle(product.name).slice(0, 500),
      description: feedDescription(product.name, product.size, product.category).slice(0, 10000),
      link: `${SITE_URL}/product/${product.id}`,
      image_link: imageLink,
      price,
      availability: product.available ? 'in stock' : 'out of stock',
      condition: 'used',
      brand: BRAND,
      google_product_category: googleProductCategory(product.category),
      size: String(product.size).slice(0, 100),
    },
  };
}

type BatchResult = { ok: true; batchId?: string } | { ok: false; error: string; status?: number };

function formatPinterestApiError(raw: string, status: number): string {
  const msg = String(raw || '').trim() || `HTTP ${status}`;
  if (/consumer type is not supported/i.test(msg)) {
    return (
      'Pinterest rejected this token type (401: consumer type not supported). ' +
      'Common causes: app trial not approved yet; Production limited test token (boards/pins only); ' +
      'sandbox token used against api.pinterest.com; or production token with PINTEREST_USE_SANDBOX=true. ' +
      'Fix: My apps → Generate token → choose Sandbox (not Production limited), set PINTEREST_USE_SANDBOX=true, redeploy. ' +
      'Or use full OAuth at api-sandbox.pinterest.com/v5/oauth/token with catalogs:write. ' +
      'CSV feed meanwhile: https://sleptonvintage.com/pinterest-catalog.csv'
    );
  }
  if (status === 401) {
    return `Pinterest unauthorized (401): ${msg}`;
  }
  if (status === 403) {
    return `Pinterest forbidden (403) — token may be read-only; need catalogs:write: ${msg}`;
  }
  return msg;
}

async function postItemsBatch(body: Record<string, unknown>): Promise<BatchResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN?.trim();
  if (!token) return { ok: false, error: 'PINTEREST_ACCESS_TOKEN not set' };

  const url = new URL(`${pinterestApiBase()}/catalogs/items/batch`);
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
    const msg = formatPinterestApiError(json?.message || text || res.statusText, res.status);
    return { ok: false, error: msg.slice(0, 800), status: res.status };
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

  return { synced, skipped, errors: [...new Set(errors)] };
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
