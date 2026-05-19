import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  deletePinterestProductIds,
  isPinterestCatalogConfigured,
  type PinterestProductRow,
  upsertPinterestProductsStrict,
} from './pinterestCatalog.js';

const PRODUCT_SELECT = 'id, name, size, category, available, image, price';

function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadProducts(ids: number[]): Promise<PinterestProductRow[]> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return [];

  const db = getServiceSupabase();
  if (!db) {
    console.warn('Pinterest sync: missing SUPABASE_SERVICE_ROLE_KEY');
    return [];
  }

  const { data, error } = await db.from('products').select(PRODUCT_SELECT).in('id', unique);
  if (error) {
    console.error('Pinterest sync: load products', error.message);
    return [];
  }
  return (data ?? []) as PinterestProductRow[];
}

/** Fire-and-forget — does not block admin/checkout responses. */
export function schedulePinterestSyncProductIds(productIds: number[]): void {
  if (!isPinterestCatalogConfigured() || productIds.length === 0) return;
  void syncPinterestProductIds(productIds).catch((err) => {
    console.error('Pinterest sync failed:', err);
  });
}

export async function syncPinterestProductIds(
  productIds: number[],
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  if (!isPinterestCatalogConfigured()) {
    return { synced: 0, skipped: 0, errors: ['PINTEREST_ACCESS_TOKEN not configured'] };
  }
  const products = await loadProducts(productIds);
  return upsertPinterestProductsStrict(products);
}

export async function syncAllPinterestProducts(): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  if (!isPinterestCatalogConfigured()) {
    return { synced: 0, skipped: 0, errors: ['PINTEREST_ACCESS_TOKEN not configured'] };
  }

  const db = getServiceSupabase();
  if (!db) {
    return { synced: 0, skipped: 0, errors: ['SUPABASE_SERVICE_ROLE_KEY not configured'] };
  }

  const { data, error } = await db
    .from('products')
    .select(PRODUCT_SELECT)
    .order('id', { ascending: true });

  if (error) {
    return { synced: 0, skipped: 0, errors: [error.message] };
  }

  return upsertPinterestProductsStrict((data ?? []) as PinterestProductRow[]);
}

export function schedulePinterestDeleteProductIds(productIds: number[]): void {
  if (!isPinterestCatalogConfigured() || productIds.length === 0) return;
  void deletePinterestProductIds(productIds).catch((err) => {
    console.error('Pinterest delete failed:', err);
  });
}
