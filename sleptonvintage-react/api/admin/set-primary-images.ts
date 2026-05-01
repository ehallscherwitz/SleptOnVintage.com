import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../adminAuth.js';

type StorageEntry = {
  name: string;
  id?: string | null;
  created_at?: string | null;
};

const IGNORED_STORAGE_NAMES = new Set(['.emptyFolderPlaceholder', '.gitkeep']);

function asBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return undefined;
}

function asInt(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.floor(n);
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAdmin(req);
  if (auth.ok === false) return res.status(auth.status).json({ error: auth.message });

  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const overwrite = asBool(req.body?.overwrite) ?? false;
  const limit = Math.min(Math.max(asInt(req.body?.limit) ?? 500, 1), 5000);

  const { data: products, error: prodErr } = await auth.service
    .from('products')
    .select('id, image')
    .order('id', { ascending: true })
    .limit(limit);

  if (prodErr) return res.status(500).json({ error: prodErr.message || 'Failed to load products' });

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  const sampleUpdates: Array<{ id: number; primary_image_path: string }> = [];

  for (const p of products || []) {
    const id = Number((p as any).id);
    const existing = ((p as any).image as string | null | undefined) || null;

    if (!overwrite && existing) {
      skipped += 1;
      continue;
    }

    const prefix = `products/${id}`;
    const { data: entries, error: listErr } = await auth.service.storage.from(bucket).list(prefix, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (listErr) {
      // If we can't list, treat as missing for now but keep going.
      missing += 1;
      continue;
    }

    const files = ((entries || []) as StorageEntry[])
      .filter((e) => e?.name && e?.id && !IGNORED_STORAGE_NAMES.has(e.name))
      .sort((a, b) => {
        // Prefer chronological by created_at; fall back to name ordering.
        const at = a.created_at ? Date.parse(a.created_at) : NaN;
        const bt = b.created_at ? Date.parse(b.created_at) : NaN;
        const aOk = Number.isFinite(at);
        const bOk = Number.isFinite(bt);
        if (aOk && bOk) return at - bt;
        if (aOk) return -1;
        if (bOk) return 1;
        return a.name.localeCompare(b.name);
      });

    const first = files[0];
    if (!first) {
      missing += 1;
      continue;
    }

    const path = `${prefix}/${first.name}`;
    const { error: upErr } = await auth.service.from('products').update({ image: path }).eq('id', id);
    if (upErr) {
      missing += 1;
      continue;
    }

    updated += 1;
    if (sampleUpdates.length < 20) sampleUpdates.push({ id, primary_image_path: path });
  }

  return res.status(200).json({
    ok: true,
    bucket,
    overwrite,
    limit,
    scanned: (products || []).length,
    updated,
    skipped,
    missing,
    sampleUpdates,
  });
}

