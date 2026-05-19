/**
 * Single Vercel serverless entry for all admin routes (Hobby plan function limit).
 * GET /api/admin?op=list-orders | list-products
 * POST /api/admin { op: "…", … }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { requireAdmin, type AdminAuthResult } from '../server/adminAuth.js';
import { productStorageObjectPrefix } from '../server/productStoragePrefix.js';
import { listGalleryFileNames, publicUrlsForFiles, sortFileNames } from '../server/productImageUtils.js';

type AdminOk = Extract<AdminAuthResult, { ok: true }>;

type ProductStorageRow = { id: number; storage_prefix: string | null; image: string | null };

/** `storage_prefix` is optional on `products` (see supabase-add-products-storage-prefix.sql). */
function toProductStorageRow(data: { id: number; image?: string | null; storage_prefix?: string | null }): ProductStorageRow {
  return {
    id: data.id,
    storage_prefix: data.storage_prefix ?? null,
    image: (data.image as string | null) ?? null,
  };
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}') as Record<string, unknown>;
    if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  } catch {
    /* empty */
  }
  return {};
}

const CATEGORIES = new Set(['shirts', 'sweaters', 'hoodies', 'jackets', 'pants', 'shorts']);
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const IGNORED_PRIMARY = new Set(['.emptyFolderPlaceholder', '.gitkeep']);

type StorageEntry = { name: string; id?: string | null };

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

function safeUploadFileName(raw: string): string | null {
  const s = raw.trim().replace(/[/\\]/g, '');
  if (!s || s.length > 120) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) return null;
  if (s === '.gitkeep' || s === '.emptyFolderPlaceholder') return null;
  return s;
}

async function getProductStorageRow(
  service: SupabaseClient,
  productId: number
): Promise<{ row: ProductStorageRow } | { error: string; status: number }> {
  const { data, error } = await service
    .from('products')
    .select('id, image')
    .eq('id', productId)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 };
  if (!data) return { error: 'Product not found', status: 404 };
  return { row: toProductStorageRow(data as { id: number; image?: string | null }) };
}

/** After rotate/crop/upload: always bump `updated_at`; sync `products.image` when this file is the thumbnail. */
async function syncProductAfterImageWrite(
  service: SupabaseClient,
  bucket: string,
  row: ProductStorageRow,
  objectPath: string,
  fileName: string
): Promise<ProductStorageRow> {
  const current = (row.image || '').trim();
  let names: string[] = [];
  try {
    names = await listGalleryFileNames(service, bucket, row);
  } catch {
    names = [];
  }
  const first = sortFileNames(names)[0];
  const patch: { image?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (!current || current === objectPath || current.endsWith(`/${fileName}`) || first === fileName) {
    patch.image = objectPath;
  }
  const { data, error } = await service
    .from('products')
    .update(patch)
    .eq('id', row.id)
    .select('id, image')
    .maybeSingle();
  if (error) {
    console.warn('sync product after image write:', error.message);
    return row;
  }
  if (!data) return row;
  return toProductStorageRow(data as { id: number; image?: string | null });
}

async function handleListOrders(_req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const { data, error } = await auth.service
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('admin list orders:', error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ orders: data ?? [] });
}

async function handleListProducts(_req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const { data, error } = await auth.service
    .from('products')
    .select('id, name, price, size, category, available, image, created_at')
    .order('id', { ascending: true })
    .limit(2000);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ products: data || [] });
}

async function handleUpdateOrder(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const orderId = body.orderId as string | undefined;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const patch: Record<string, unknown> = {};
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.carrier === 'string') patch.carrier = body.carrier;
  if (body.tracking_number === null) patch.tracking_number = null;
  else if (typeof body.tracking_number === 'string') patch.tracking_number = body.tracking_number;
  if (body.tracking_url === null) patch.tracking_url = null;
  else if (typeof body.tracking_url === 'string') patch.tracking_url = body.tracking_url;
  if (body.status === 'shipped' || body.markShipped) patch.shipped_at = new Date().toISOString();
  patch.updated_at = new Date().toISOString();

  const { data, error } = await auth.service.from('orders').update(patch).eq('id', orderId).select().maybeSingle();
  if (error) {
    console.error('admin update order:', error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ order: data });
}

async function handleDeleteOrder(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const orderId = body.orderId as string | undefined;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const { data: items, error: itemsErr } = await auth.service.from('order_items').select('product_id').eq('order_id', orderId);
  if (itemsErr) {
    console.error('admin delete order (items):', itemsErr);
    return res.status(500).json({ error: itemsErr.message });
  }
  const productIds = [...new Set((items || []).map((r: { product_id: number }) => r.product_id))];
  if (productIds.length > 0) {
    const { error: availErr } = await auth.service.from('products').update({ available: true }).in('id', productIds);
    if (availErr) {
      console.error('admin delete order (products):', availErr);
      return res.status(500).json({ error: availErr.message });
    }
  }
  const { error: delErr } = await auth.service.from('orders').delete().eq('id', orderId);
  if (delErr) {
    console.error('admin delete order:', delErr);
    return res.status(500).json({ error: delErr.message });
  }
  return res.status(200).json({ success: true, restoredProductIds: productIds });
}

async function handleCreateProduct(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const size = typeof body.size === 'string' ? body.size.trim() : '';
  if (!name) return res.status(400).json({ error: 'name required' });
  if (!size) return res.status(400).json({ error: 'size required' });

  const pr = body.priceCents;
  const priceCents =
    typeof pr === 'number' && Number.isFinite(pr)
      ? Math.floor(pr)
      : typeof pr === 'string' && pr.trim()
        ? parseInt(pr, 10)
        : NaN;
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return res.status(400).json({ error: 'priceCents required (integer >= 0)' });
  }

  const c = typeof body.category === 'string' ? body.category.trim().toLowerCase() : '';
  if (!CATEGORIES.has(c)) return res.status(400).json({ error: 'Invalid category' });

  const available = typeof body.available === 'boolean' ? body.available : true;

  let image: string | null = null;
  if (body.image === null) image = null;
  else if (typeof body.image === 'string') {
    const im = body.image.trim();
    image = im || null;
  }

  const insert: Record<string, unknown> = {
    name,
    size,
    price: priceCents,
    category: c,
    available,
    image,
  };

  const { data, error } = await auth.service.from('products').insert(insert).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ product: data });
}

async function handleGetProduct(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.productId;
  const id = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'productId required' });

  const { data, error } = await auth.service.from('products').select('*').eq('id', id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });

  const row = data as { id: number; storage_prefix?: string | null };
  const storageObjectPrefix = productStorageObjectPrefix({
    id: row.id,
    storage_prefix: row.storage_prefix ?? null,
  });
  return res.status(200).json({ product: data, storageObjectPrefix });
}

async function handleUpdateProduct(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.id;
  const id = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id required' });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string') {
    const n = body.name.trim();
    if (!n) return res.status(400).json({ error: 'name cannot be empty' });
    patch.name = n;
  }
  if (typeof body.size === 'string') {
    const s = body.size.trim();
    if (!s) return res.status(400).json({ error: 'size cannot be empty' });
    patch.size = s;
  }
  if (typeof body.priceCents === 'number' && Number.isFinite(body.priceCents) && body.priceCents >= 0) {
    patch.price = Math.floor(body.priceCents);
  }
  if (typeof body.category === 'string') {
    const c = body.category.trim().toLowerCase();
    if (!CATEGORIES.has(c)) return res.status(400).json({ error: 'Invalid category' });
    patch.category = c;
  }
  if (typeof body.available === 'boolean') patch.available = body.available;
  if (body.image === null) patch.image = null;
  else if (typeof body.image === 'string') patch.image = body.image.trim() || null;

  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const { data, error } = await auth.service.from('products').update(patch).eq('id', id).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ product: data });
}

async function handleDeleteProduct(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.productId;
  const productId = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(productId)) return res.status(400).json({ error: 'productId required' });

  const { count, error: cntErr } = await auth.service
    .from('order_items')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);
  if (cntErr) return res.status(500).json({ error: cntErr.message });
  if ((count ?? 0) > 0) {
    return res.status(409).json({
      error:
        'Cannot delete: this product appears on past orders. Unlist it (available=false) instead, or remove order history in the database.',
    });
  }

  const { data: row, error: getErr } = await auth.service.from('products').select('id').eq('id', productId).maybeSingle();
  if (getErr) return res.status(500).json({ error: getErr.message });
  if (!row) return res.status(404).json({ error: 'Product not found' });

  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const prefixRow = { id: productId, storage_prefix: (row as { storage_prefix?: string | null }).storage_prefix ?? null };
  const prefix = productStorageObjectPrefix(prefixRow);

  try {
    const names = await listGalleryFileNames(auth.service, bucket, prefixRow);
    const paths = names.map((n) => `${prefix}/${n}`);
    if (paths.length > 0) {
      const { error: rmErr } = await auth.service.storage.from(bucket).remove(paths);
      if (rmErr) console.error('storage remove:', rmErr);
    }
    const gitPath = `${prefix}/.gitkeep`;
    const { error: gitErr } = await auth.service.storage.from(bucket).remove([gitPath]);
    if (gitErr) console.warn('remove .gitkeep:', gitErr.message);
  } catch (e) {
    console.error('delete product storage cleanup:', e);
  }

  await auth.service.from('cart_items').delete().eq('product_id', productId);
  const { error: delErr } = await auth.service.from('products').delete().eq('id', productId);
  if (delErr) return res.status(500).json({ error: delErr.message });
  return res.status(200).json({ ok: true });
}

async function handleProductImagesList(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.productId;
  const productId = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(productId)) return res.status(400).json({ error: 'productId required' });

  const loaded = await getProductStorageRow(auth.service, productId);
  if ('error' in loaded) return res.status(loaded.status).json({ error: loaded.error });
  const prefixRow = loaded.row;

  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const prefix = productStorageObjectPrefix(prefixRow);
  try {
    const names = await listGalleryFileNames(auth.service, bucket, prefixRow);
    const files = publicUrlsForFiles(auth.service, bucket, prefix, names);
    return res.status(200).json({ prefix, files });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'List failed';
    return res.status(500).json({ error: msg });
  }
}

async function handleProductImageUpload(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.productId;
  const productId = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(productId)) return res.status(400).json({ error: 'productId required' });

  const fileName = safeUploadFileName(String(body.fileName || ''));
  if (!fileName) return res.status(400).json({ error: 'Invalid fileName' });

  const replaceFileName = safeUploadFileName(String(body.replaceFileName || ''));

  const contentType =
    typeof body.contentType === 'string' && body.contentType.trim() ? body.contentType.trim() : 'application/octet-stream';
  const b64 = typeof body.dataBase64 === 'string' ? body.dataBase64.trim() : '';
  if (!b64) return res.status(400).json({ error: 'dataBase64 required' });

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64' });
  }
  if (buffer.length === 0) return res.status(400).json({ error: 'Empty file' });
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: `File too large (max ${MAX_UPLOAD_BYTES} bytes). Compress or resize the image.` });
  }

  const loaded = await getProductStorageRow(auth.service, productId);
  if ('error' in loaded) return res.status(loaded.status).json({ error: loaded.error });
  const prefixRow = loaded.row;

  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const prefix = productStorageObjectPrefix(prefixRow);
  const path = `${prefix}/${fileName}`;

  const { error: upErr } = await auth.service.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: '60',
  });
  if (upErr) return res.status(500).json({ error: upErr.message });

  let syncedRow = await syncProductAfterImageWrite(auth.service, bucket, prefixRow, path, fileName);

  if (replaceFileName && replaceFileName !== fileName) {
    const oldPath = `${prefix}/${replaceFileName}`;
    const { error: rmErr } = await auth.service.storage.from(bucket).remove([oldPath]);
    if (rmErr) console.warn('remove replaced image:', rmErr.message);
    const cur = (syncedRow.image || '').trim();
    if (cur === oldPath || cur.endsWith(`/${replaceFileName}`)) {
      syncedRow = await syncProductAfterImageWrite(auth.service, bucket, syncedRow, path, fileName);
    }
  }

  const { data: product, error: prodErr } = await auth.service.from('products').select('*').eq('id', productId).maybeSingle();
  if (prodErr) return res.status(500).json({ error: prodErr.message });

  const publicUrl = auth.service.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return res.status(200).json({ path, publicUrl, fileName, product });
}

function mimeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

async function handleProductImageDownload(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.productId;
  const productId = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(productId)) return res.status(400).json({ error: 'productId required' });

  const fileName = String(body.fileName || '').trim().replace(/[/\\]/g, '');
  if (!fileName || fileName.includes('..')) return res.status(400).json({ error: 'Invalid fileName' });

  const loaded = await getProductStorageRow(auth.service, productId);
  if ('error' in loaded) return res.status(loaded.status).json({ error: loaded.error });
  const prefixRow = loaded.row;

  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const prefix = productStorageObjectPrefix(prefixRow);
  const path = `${prefix}/${fileName}`;

  const { data, error: dlErr } = await auth.service.storage.from(bucket).download(path);
  if (dlErr || !data) return res.status(404).json({ error: dlErr?.message || 'Image not found' });

  const buf = Buffer.from(await data.arrayBuffer());
  const contentType = data.type && data.type.startsWith('image/') ? data.type : mimeFromFileName(fileName);
  return res.status(200).json({ contentType, dataBase64: buf.toString('base64') });
}

async function handleProductImageDelete(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.productId;
  const productId = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(productId)) return res.status(400).json({ error: 'productId required' });

  const fileName = String(body.fileName || '').trim().replace(/[/\\]/g, '');
  if (!fileName || fileName.includes('..')) return res.status(400).json({ error: 'Invalid fileName' });

  const loaded = await getProductStorageRow(auth.service, productId);
  if ('error' in loaded) return res.status(loaded.status).json({ error: loaded.error });
  const row = loaded.row;

  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const prefixRow = row;
  const prefix = productStorageObjectPrefix(prefixRow);
  const path = `${prefix}/${fileName}`;

  const { error: rmErr } = await auth.service.storage.from(bucket).remove([path]);
  if (rmErr) return res.status(500).json({ error: rmErr.message });

  const currentImage = row.image || '';
  if (currentImage === path || currentImage.endsWith(`/${fileName}`)) {
    await auth.service.from('products').update({ image: null }).eq('id', productId);
  }
  return res.status(200).json({ ok: true });
}

async function handleProductImagesReorder(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const idRaw = body.productId;
  const productId = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(productId)) return res.status(400).json({ error: 'productId required' });

  const ordered = body.orderedFileNames;
  if (!Array.isArray(ordered) || ordered.length === 0) return res.status(400).json({ error: 'orderedFileNames required' });
  const names = ordered.map((x) => String(x || '').trim()).filter(Boolean);
  if (names.length !== ordered.length) return res.status(400).json({ error: 'Invalid orderedFileNames' });

  const loaded = await getProductStorageRow(auth.service, productId);
  if ('error' in loaded) return res.status(loaded.status).json({ error: loaded.error });
  const rowForPrefix = loaded.row;

  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const prefix = productStorageObjectPrefix(rowForPrefix);

  let onDisk: string[];
  try {
    onDisk = await listGalleryFileNames(auth.service, bucket, rowForPrefix);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'List failed';
    return res.status(500).json({ error: msg });
  }

  const a = sortFileNames(onDisk).join('\u0000');
  const b = sortFileNames(names).join('\u0000');
  if (a !== b) {
    return res.status(400).json({ error: 'orderedFileNames must match existing files exactly (same names, any order).' });
  }

  const uid = randomUUID();
  const tmpPaths: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const from = `${prefix}/${names[i]}`;
    const tmp = `${prefix}/.__reorder_${uid}_${i}`;
    tmpPaths.push(tmp);
    const { error } = await auth.service.storage.from(bucket).move(from, tmp);
    if (error) return res.status(500).json({ error: `Move to temp failed: ${error.message}` });
  }

  const pad = (n: number) => String(n).padStart(Math.max(2, String(names.length).length), '0');
  for (let i = 0; i < names.length; i++) {
    const orig = names[i];
    const ext = orig.includes('.') ? orig.slice(orig.lastIndexOf('.')) : '';
    const dest = `${prefix}/${pad(i + 1)}${ext}`;
    const tmp = tmpPaths[i];
    const { error } = await auth.service.storage.from(bucket).move(tmp, dest);
    if (error) return res.status(500).json({ error: `Move to final failed: ${error.message}` });
  }

  const firstExt = names[0]?.includes('.') ? names[0].slice(names[0].lastIndexOf('.')) : '';
  const firstName = `${pad(1)}${firstExt}`;
  await syncProductAfterImageWrite(auth.service, bucket, rowForPrefix, `${prefix}/${firstName}`, firstName);

  return res.status(200).json({ ok: true });
}

async function handleSetPrimaryImages(req: VercelRequest, res: VercelResponse, auth: AdminOk) {
  const body = parseBody(req);
  const bucket = (process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'images').trim();
  const overwrite = asBool(body.overwrite) ?? false;
  const limit = Math.min(Math.max(asInt(body.limit) ?? 500, 1), 5000);

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
    const id = Number((p as { id: unknown }).id);
    const existing = ((p as { image?: string | null }).image as string | null | undefined) || null;
    if (!overwrite && existing) {
      skipped += 1;
      continue;
    }
    const prefix = productStorageObjectPrefix({ id, storage_prefix: (p as { storage_prefix?: string | null }).storage_prefix ?? null });
    const { data: entries, error: listErr } = await auth.service.storage.from(bucket).list(prefix, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (listErr) {
      missing += 1;
      continue;
    }
    const files = ((entries || []) as StorageEntry[])
      .filter((e) => Boolean(e?.name) && !IGNORED_PRIMARY.has(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await requireAdmin(req);
  if (auth.ok === false) return res.status(auth.status).json({ error: auth.message });

  if (req.method === 'GET') {
    const op = String((req.query as { op?: string })?.op || '').trim();
    if (op === 'list-orders') return handleListOrders(req, res, auth);
    if (op === 'list-products') return handleListProducts(req, res, auth);
    return res.status(400).json({ error: 'Use GET ?op=list-orders or ?op=list-products' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req);
  const op = String(body.op || '').trim();

  switch (op) {
    case 'update-order':
      return handleUpdateOrder(req, res, auth);
    case 'delete-order':
      return handleDeleteOrder(req, res, auth);
    case 'create-product':
      return handleCreateProduct(req, res, auth);
    case 'get-product':
      return handleGetProduct(req, res, auth);
    case 'update-product':
      return handleUpdateProduct(req, res, auth);
    case 'delete-product':
      return handleDeleteProduct(req, res, auth);
    case 'product-images-list':
      return handleProductImagesList(req, res, auth);
    case 'product-image-upload':
      return handleProductImageUpload(req, res, auth);
    case 'product-image-download':
      return handleProductImageDownload(req, res, auth);
    case 'product-image-delete':
      return handleProductImageDelete(req, res, auth);
    case 'product-images-reorder':
      return handleProductImagesReorder(req, res, auth);
    case 'set-primary-images':
      return handleSetPrimaryImages(req, res, auth);
    default:
      return res.status(400).json({ error: 'Missing or unknown op in JSON body' });
  }
}
